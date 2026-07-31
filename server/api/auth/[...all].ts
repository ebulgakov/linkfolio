const PAYLOAD_METHODS = new Set(["PATCH", "POST", "PUT", "DELETE"]);

export default defineEventHandler(async event => {
  const path = event.context.params?.all ?? "";
  const target = `${process.env.NEON_AUTH_BASE_URL}/${path}`;

  const headers = getProxyRequestHeaders(event, { host: false });

  // Forwarding the original request's `content-length` verbatim into a brand-new
  // fetch() call is fragile: the header describes the byte length of the ORIGINAL
  // request body, but by the time it reaches undici here it's carried alongside a
  // body that's been re-read (via readRawBody below) and passed through this
  // process's instrumentation (Sentry's fetch/http auto-instrumentation is active
  // here - see sentry.server.config.ts). That combination made every proxied
  // POST/PUT/PATCH/DELETE (sign-in, sign-out, etc.) fail with undici's
  // "invalid content-length header" (confirmed by reproducing the exact same
  // target/headers/body via a bare `fetch()` outside this process, where it
  // succeeds). Deleting it lets fetch/undici compute the correct value itself
  // from the body actually being sent.
  delete headers["content-length"];

  // Nitro's dev server reports the browser-facing request as `x-forwarded-proto: http`
  // (since `pnpm dev` serves plain HTTP locally). Forwarding that verbatim makes Neon Auth's
  // edge think this hop is insecure and issue an HTTPS-upgrade redirect, which then crashes
  // Node's fetch on redirect-body replay for buffered POST bodies. This proxy call to Neon
  // always happens over HTTPS regardless of how the browser reached us, so report that instead.
  //
  // Vercel also sets `x-forwarded-host` to the browser-facing domain (e.g. linkfolio.ebulgakov.com).
  // h3's proxyRequest forwards it verbatim, so Neon Auth sees our app's domain instead of its own
  // host and rejects the request with INVALID_HOSTNAME. Override it to Neon Auth's own host.
  headers["x-forwarded-proto"] = "https";
  headers["x-forwarded-host"] = new URL(target).host;

  const body = PAYLOAD_METHODS.has(event.method) ? await readRawBody(event, false) : undefined;

  return sendProxy(event, target, {
    fetchOptions: {
      method: event.method,
      // Buffer satisfies BodyInit at runtime (it's an ArrayBufferView, same as
      // any other Uint8Array) - the mismatch is TS's RequestInit typing, not
      // an actual incompatibility.
      body: body as BodyInit | undefined,
      headers
    }
  });
});

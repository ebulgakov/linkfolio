export default defineEventHandler(event => {
  const path = event.context.params?.all ?? "";
  const target = `${process.env.NEON_AUTH_BASE_URL}/${path}`;

  // Nitro's dev server reports the browser-facing request as `x-forwarded-proto: http`
  // (since `pnpm dev` serves plain HTTP locally). Forwarding that verbatim makes Neon Auth's
  // edge think this hop is insecure and issue an HTTPS-upgrade redirect, which then crashes
  // Node's fetch on redirect-body replay for buffered POST bodies. This proxy call to Neon
  // always happens over HTTPS regardless of how the browser reached us, so report that instead.
  //
  // Vercel also sets `x-forwarded-host` to the browser-facing domain (e.g. linkfolio.ebulgakov.com).
  // h3's proxyRequest forwards it verbatim, so Neon Auth sees our app's domain instead of its own
  // host and rejects the request with INVALID_HOSTNAME. Override it to Neon Auth's own host.
  return proxyRequest(event, target, {
    fetchOptions: {
      headers: {
        "x-forwarded-proto": "https",
        "x-forwarded-host": new URL(target).host
      }
    }
  });
});

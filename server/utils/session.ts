import type { H3Event } from "h3";

// Nitro auto-imports everything under `server/utils/*`, so `requireUserId` is
// available in route handlers with no explicit import.
//
// There is no local Better-Auth server instance in this app — auth is
// proxied entirely to Neon Auth via `server/api/auth/[...all].ts`. To read
// the current session from a raw Nitro handler, we self-fetch the proxy's
// `get-session` route (same pattern as the client-side `useAuth()` composable
// in `app/shared/api/use-auth.ts`, reimplemented with h3's event-based
// equivalent of Nuxt's `useRequestHeaders`, which isn't available outside
// Nuxt's request context).
//
// Deliberately no `baseURL` on the `$fetch` call below: Nitro's global
// `$fetch` (auto-imported, same one used here) is built with `localFetch` as
// its transport (see `localFetch` in
// nitropack/dist/runtime/internal/app.mjs) — for a relative path it skips
// the network entirely and dispatches in-process via
// `fetchNodeRequestHandler(nodeHandler, ...)`, invoking the `[...all].ts`
// proxy route directly. `localFetch` only falls back to a real
// `globalThis.fetch` hop when the resolved input does NOT start with "/",
// which is exactly what happens if `baseURL` is set to an absolute origin.
// This file used to pass `baseURL: getRequestURL(event).origin` — but that
// origin is derived from the client-supplied `Host` header, so a forged
// Host would resolve the request to an absolute, attacker-controlled URL
// and `localFetch` would hairpin out to it over real HTTP, cookie and all.
// Leaving the call relative avoids trusting that header at all.
interface GetSessionResponse {
  session: unknown;
  user: { id: string };
}

// A few seconds is generous for an in-process/local hop; this exists so a
// hung auth backend can't hang every route that calls `requireUserId`.
const GET_SESSION_TIMEOUT_MS = 5000;

/**
 * Resolves the authenticated user's id from the request's session cookie, or
 * throws a 401 `createError` if there isn't one. Every collections route
 * calls this first and scopes its query by the returned `userId`.
 */
export async function requireUserId(event: H3Event): Promise<string> {
  const headers = getRequestHeaders(event);

  let result: GetSessionResponse | null;
  try {
    result = await $fetch<GetSessionResponse | null>("/api/auth/get-session", {
      headers: { cookie: headers.cookie ?? "" },
      timeout: GET_SESSION_TIMEOUT_MS
    });
  } catch {
    // The fetch itself failed (timeout or transport error) — semantically
    // different from "the auth backend responded but there's no session"
    // below, which stays a 401. This is an upstream failure, so 502.
    throw createError({ statusCode: 502, statusMessage: "Auth service unavailable" });
  }

  if (!result?.user?.id) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  return result.user.id;
}

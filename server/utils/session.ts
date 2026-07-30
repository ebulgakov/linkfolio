import type { H3Event } from "h3";

// Nitro auto-imports everything under `server/utils/*`, so `requireUserId` is
// available in route handlers with no explicit import.
//
// There is no local Better-Auth server instance in this app — auth is
// proxied entirely to Neon Auth via `server/api/auth/[...all].ts`. To read
// the current session from a raw Nitro handler, we self-fetch the proxy's
// `get-session` route (same pattern as the client-side `useAuth()` composable
// in `app/shared/api/use-auth.ts`, reimplemented with h3's event-based
// equivalents of Nuxt's `useRequestHeaders`/`useRequestURL`, which aren't
// available outside Nuxt's request context).
interface GetSessionResponse {
  session: unknown;
  user: { id: string };
}

/**
 * Resolves the authenticated user's id from the request's session cookie, or
 * throws a 401 `createError` if there isn't one. Every collections route
 * calls this first and scopes its query by the returned `userId`.
 */
export async function requireUserId(event: H3Event): Promise<string> {
  const headers = getRequestHeaders(event);
  const url = getRequestURL(event);

  const result = await $fetch<GetSessionResponse | null>("/api/auth/get-session", {
    baseURL: url.origin,
    headers: { cookie: headers.cookie ?? "" }
  });

  if (!result?.user?.id) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  return result.user.id;
}

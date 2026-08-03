import { useAuth } from "./use-auth";

// better-auth/vue's useSession(customFetcher) only ever calls customFetcher(url, { ref }) —
// it never forwards the client's own fetchOptions.headers, so the cookie useAuth() attaches
// for SSR is otherwise dropped here and the server-side session lookup comes back unauthenticated.
//
// url arrives absolute (useAuth()'s baseURL is the request origin): keep it relative for
// useFetch so SSR resolves it via Nitro's internal handler instead of an actual self-fetch
// over the network, which serverless targets like Vercel can't reliably serve mid-request.
//
// Returns the authClient instance too, so callers that also sign out (see use-auth-buttons.ts)
// reuse the same client rather than creating a second one with its own auth state.
export async function useAuthSession() {
  const authClient = useAuth();

  const { data: session } = await authClient.useSession((url, opts) =>
    useFetch(new URL(url).pathname + new URL(url).search, {
      ...opts,
      key: "auth-session",
      headers: import.meta.server ? useRequestHeaders(["cookie"]) : undefined
    })
  );
  return { session, authClient };
}

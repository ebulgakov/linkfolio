import { useAuth } from "./use-auth";

// better-auth/vue's useSession(customFetcher) only ever calls customFetcher(url, { ref }) —
// it never forwards the client's own fetchOptions.headers, so the cookie useAuth() attaches
// for SSR is otherwise dropped here and the server-side session lookup comes back unauthenticated.
export async function useAuthSession() {
  const authClient = useAuth();

  const { data: session } = await authClient.useSession((url, opts) =>
    useFetch(url, {
      ...opts,
      key: "auth-session",
      headers: import.meta.server ? useRequestHeaders(["cookie"]) : undefined
    })
  );
  return { session };
}

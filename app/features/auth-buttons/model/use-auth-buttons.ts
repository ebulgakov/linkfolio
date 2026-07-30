import { useAuth } from "~/shared/api";

export async function useAuthButtons() {
  const authClient = useAuth();
  const router = useRouter();
  // better-auth/vue's useSession(customFetcher) only ever calls customFetcher(url, { ref }) —
  // it never forwards the client's own fetchOptions.headers, so the cookie useAuth() attaches
  // for SSR is otherwise dropped here and the server-side session lookup comes back unauthenticated.
  // useRouter() must be called before this await: Nuxt/Vue only restores the component instance
  // context across an async setup's await automatically inside <script setup>, not inside a
  // plain composable function — a composable call placed after the await here would throw
  // "called outside of a plugin/setup" once extracted out of the .vue file.
  const { data: session } = await authClient.useSession((url, opts) =>
    useFetch(url, {
      ...opts,
      key: "auth-session",
      headers: import.meta.server ? useRequestHeaders(["cookie"]) : undefined
    })
  );

  async function logOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: async () => {
          await refreshNuxtData("auth-session");
          router.push("/login");
        }
      }
    });
  }

  function goToLogin() {
    router.push("/login");
  }

  function goToSignup() {
    router.push("/signup");
  }

  return { session, logOut, goToLogin, goToSignup };
}

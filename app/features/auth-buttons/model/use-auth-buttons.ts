import { useAuthSession } from "~/shared/api";

export async function useAuthButtons() {
  const router = useRouter();
  // useRouter() must be called before this await: Nuxt/Vue only restores the component instance
  // context across an async setup's await automatically inside <script setup>, not inside a
  // plain composable function — a composable call placed after the await here would throw
  // "called outside of a plugin/setup" once extracted out of the .vue file.
  const { session, authClient } = await useAuthSession();

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

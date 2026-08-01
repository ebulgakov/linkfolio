import { useAuth } from "~/shared/api";

export async function useLandingHero() {
  // Deliberately not wrapped in useAsyncData/useFetch: must stay a fresh,
  // uncached read so the /login -> refreshNuxtData("auth-session") ->
  // navigateTo("/collections") flow immediately reflects the new session,
  // rather than showing a stale "anonymous" result under a separate cache key.
  const { data: session } = await useAuth().getSession();
  return { loggedIn: !!session };
}

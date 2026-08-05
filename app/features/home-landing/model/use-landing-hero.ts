import { useAuthSession } from "~/shared/api";

export async function useLandingHero() {
  const { session } = await useAuthSession();
  return { loggedIn: !!session.value };
}

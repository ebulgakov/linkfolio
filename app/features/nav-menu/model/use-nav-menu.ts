import { useAuthSession } from "~/shared/api";

export async function useNavMenu() {
  return await useAuthSession();
}

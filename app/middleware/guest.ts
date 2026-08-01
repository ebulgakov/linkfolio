import { useAuth } from "~/shared/api";

export default defineNuxtRouteMiddleware(async () => {
  const { data: session } = await useAuth().getSession();
  if (session) {
    return navigateTo("/collections");
  }
});

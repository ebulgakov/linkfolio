import { useAuth } from "~/shared/api";

export default defineNuxtRouteMiddleware(async route => {
  const { data: session } = await useAuth().getSession();
  if (!session) {
    return navigateTo({ path: "/login", query: { redirect: route.fullPath } });
  }
});

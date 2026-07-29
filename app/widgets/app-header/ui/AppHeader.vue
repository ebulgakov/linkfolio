<script lang="ts" setup>
import { useAuth } from "~/shared/api/use-auth";

const authClient = useAuth();
// better-auth/vue's useSession(customFetcher) only ever calls customFetcher(url, { ref }) —
// it never forwards the client's own fetchOptions.headers, so the cookie useAuth() attaches
// for SSR is otherwise dropped here and the server-side session lookup comes back unauthenticated.
const { data: session } = await authClient.useSession((url, opts) =>
  useFetch(url, {
    ...opts,
    key: "auth-session",
    headers: import.meta.server ? useRequestHeaders(["cookie"]) : undefined
  })
);
const router = useRouter();

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
</script>

<template>
  <v-app-bar class="px-4">
    <NuxtLink to="/" class="d-flex align-center ma-0 text-primary text-decoration-none">
      <nuxt-img src="/linkfolio-logo.svg" alt="Linkfolio Logo" width="40" height="40" />
      <figcaption class="mt-2 text-body-large">Linkfolio</figcaption>
    </NuxtLink>
    <v-spacer />
    <template v-if="session?.user">
      <span class="username">{{ session.user.name || session.user.email }}</span>
      <v-btn @click="logOut">Log Out</v-btn>
    </template>
    <template v-else>
      <div class="d-flex ga-3">
        <v-btn color="primary" variant="outlined" @click="router.push('/login')">Log In</v-btn>
        <v-btn color="primary" variant="tonal" @click="router.push('/signup')">Sign Up</v-btn>
      </div>
    </template>
  </v-app-bar>
</template>

<style lang="css" scoped>
.username {
  margin-right: 16px;
}
</style>

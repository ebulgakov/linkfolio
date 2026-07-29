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
  <v-app-bar>
    <v-spacer />
    <template v-if="session?.user">
      <span class="username">{{ session.user.name || session.user.email }}</span>
      <v-btn @click="logOut">Log Out</v-btn>
    </template>
  </v-app-bar>
</template>

<style lang="css" scoped>
.username {
  margin-right: 16px;
}
</style>

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
  <a-flex class="header">
    <a-flex v-if="session?.user" align="center" gap="middle" class="username">
      <span>{{ session.user.name || session.user.email }}</span>
      <a-button @click="logOut">Log Out</a-button>
    </a-flex>
  </a-flex>
</template>

<style lang="css" scoped>
.header {
  padding: 12px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.username {
  margin-left: auto;
}
</style>

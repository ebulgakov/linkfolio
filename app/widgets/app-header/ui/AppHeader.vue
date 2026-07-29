<script lang="ts" setup>
import { authClient } from "~/shared/api/auth-client";

const { data: session } = await authClient.useSession((url, opts) =>
  useFetch(url, { ...opts, key: "auth-session" })
);
const router = useRouter();

async function logOut() {
  await authClient.signOut({
    fetchOptions: {
      onSuccess: () => {
        router.push("/login");
      }
    }
  });
}
</script>

<template>
  <a-flex class="header">
    <a-flex v-if="session" align="center" gap="middle" class="username">
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

<script lang="ts" setup>
import { useAuthButtons } from "../model/use-auth-buttons";

const { t } = useI18n();
const { session, logOut, goToLogin, goToSignup } = await useAuthButtons();
</script>

<template>
  <template v-if="session?.user">
    <span class="username">{{ session.user.name || session.user.email }}</span>
    <v-btn @click="logOut">{{ t("nav.logOut") }}</v-btn>
  </template>
  <template v-else>
    <div class="d-flex ga-3">
      <v-btn color="primary" variant="outlined" @click="goToLogin">{{ t("nav.logIn") }}</v-btn>
      <v-btn color="primary" variant="tonal" @click="goToSignup">{{ t("nav.signUp") }}</v-btn>
    </div>
  </template>
</template>

<style lang="css" scoped>
.username {
  margin-right: 16px;
}
</style>

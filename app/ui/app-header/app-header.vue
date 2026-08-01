<script lang="ts" setup>
import AppLogo from "./app-logo.vue";

import { AuthButtons } from "~/features/auth-buttons";

const { t } = useI18n();
</script>

<template>
  <v-app-bar class="px-4">
    <AppLogo />
    <v-btn to="/published-collections" variant="text">{{ t("nav.publishedCollections") }}</v-btn>
    <v-spacer />
    <AuthButtons />
  </v-app-bar>
</template>

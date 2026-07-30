<script lang="ts" setup>
import AppLogo from "./app-logo.vue";

import { AuthButtons } from "~/features/auth-buttons";
</script>

<template>
  <v-app-bar class="px-4">
    <AppLogo />
    <v-spacer />
    <AuthButtons />
  </v-app-bar>
</template>

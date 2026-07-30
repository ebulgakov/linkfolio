<script lang="ts" setup>
import AppHeader from "~/ui/app-header.vue";
import { AppFooter } from "~/widgets/app-footer";
</script>

<template>
  <NuxtLayout>
    <v-app>
      <AppHeader />
      <v-main>
        <NuxtPage />
      </v-main>
      <AppFooter />
    </v-app>
  </NuxtLayout>
</template>

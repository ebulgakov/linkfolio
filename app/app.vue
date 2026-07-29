<script lang="ts" setup>
import { AppFooter } from "~/widgets/app-footer";
import { AppHeader } from "~/widgets/app-header";
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

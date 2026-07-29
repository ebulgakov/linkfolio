<script lang="ts" setup>
import { AppHeader } from "~/widgets/app-header";
</script>

<template>
  <NuxtLayout>
    <v-app>
      <AppHeader />
      <v-main>
        <NuxtPage />
      </v-main>
    </v-app>
  </NuxtLayout>
</template>

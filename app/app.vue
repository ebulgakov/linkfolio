<script lang="ts" setup>
import AppFooter from "~/ui/app-footer.vue";
import AppHeader from "~/ui/app-header/app-header.vue";
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

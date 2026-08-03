<script setup lang="ts">
import { useNavMenu } from "~/features/nav-menu/model/use-nav-menu.ts";

const { t } = useI18n();

const { session } = await useNavMenu();
</script>

<template>
  <v-btn to="/published-collections" variant="text">{{ t("nav.publishedCollections") }}</v-btn>

  <v-btn v-if="session?.user" to="/collections" variant="text">{{ t("nav.myCollections") }}</v-btn>
</template>

<style scoped lang="css"></style>

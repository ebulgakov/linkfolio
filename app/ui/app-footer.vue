<script lang="ts" setup>
import { CopyrightNotice } from "~/features/copyright";
import { LocaleSwitcher } from "~/features/locale-switcher";
</script>

<template>
  <v-footer border app class="d-flex justify-space-between align-center flex-wrap ga-2">
    <CopyrightNotice />
    <LocaleSwitcher />
  </v-footer>
</template>

<script lang="ts" setup>
import FooterLinks from "./footer-links.vue";

import { CopyrightNotice } from "~/features/copyright";
import { LocaleSwitcher } from "~/features/locale-switcher";
</script>

<template>
  <v-footer app class="d-flex justify-space-between align-center flex-wrap ga-2">
    <CopyrightNotice />
    <FooterLinks />
    <LocaleSwitcher />
  </v-footer>
</template>

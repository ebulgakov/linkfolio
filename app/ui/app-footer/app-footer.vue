<script lang="ts" setup>
import FooterCopyright from "./footer-copyright.vue";
import FooterLinks from "./footer-links.vue";

import { LocaleSwitcher } from "~/features/locale-switcher";
</script>

<template>
  <v-footer app class="d-flex justify-space-between align-center flex-wrap ga-2">
    <FooterCopyright />
    <FooterLinks />
    <LocaleSwitcher />
  </v-footer>
</template>

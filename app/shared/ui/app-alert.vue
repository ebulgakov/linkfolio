<script lang="ts" setup>
defineProps<{
  type: "success" | "info" | "warning" | "error";
  variant?: "flat" | "tonal" | "outlined" | "text" | "elevated" | "plain";
  closable?: boolean;
  text?: string;
}>();
</script>

<template>
  <v-alert :type="type" :variant="variant" :closable="closable" :text="text">
    <slot />
  </v-alert>
</template>

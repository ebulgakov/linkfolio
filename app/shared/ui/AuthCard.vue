<script lang="ts" setup>
defineProps<{
  title: string;
}>();
</script>

<template>
  <v-container class="fill-height d-flex align-center justify-center">
    <v-card :title="title" style="width: 100%; max-width: 400px">
      <v-card-text>
        <slot />
      </v-card-text>
    </v-card>
  </v-container>
</template>

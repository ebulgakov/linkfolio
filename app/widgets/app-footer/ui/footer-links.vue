<script lang="ts" setup>
const links = [{ label: "GitHub", href: "https://github.com/ebulgakov/linkfolio/" }];
</script>

<template>
  <div class="d-flex ga-4">
    <a
      v-for="link in links"
      :key="link.href"
      :href="link.href"
      target="_blank"
      rel="noopener noreferrer"
      class="text-caption text-decoration-none"
    >
      {{ link.label }}
    </a>
  </div>
</template>

<script lang="ts" setup>
import { useCopyright } from "~/features/copyright";

const copyright = useCopyright();
const link = { label: "GitHub", href: "https://github.com/ebulgakov/linkfolio/" };
</script>

<template>
  <span class="text-caption">
    <a
      :href="link.href"
      :title="link.label"
      target="_blank"
      rel="noopener noreferrer"
      class="text-caption text-decoration-none text-primary"
    >
      {{ copyright }}
    </a>
  </span>
</template>

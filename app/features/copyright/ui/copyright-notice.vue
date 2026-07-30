<script lang="ts" setup>
import { useCopyright } from "~/features/copyright";

const copyright = useCopyright();
</script>

<template>
  <span class="text-caption">{{ copyright }}</span>
</template>

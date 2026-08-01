<script lang="ts" setup>
import { CollectionsList } from "~/features/collections";

definePageMeta({ middleware: "auth" });
</script>

<template>
  <CollectionsList />
</template>

<script lang="ts" setup>
const { t } = useI18n();

const year = new Date().getFullYear();
</script>

<template>
  <span class="text-caption">{{ t("footer.copyright", { year }) }}</span>
</template>

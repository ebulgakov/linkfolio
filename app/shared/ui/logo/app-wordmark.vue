<script lang="ts" setup>
const { t } = useI18n();
</script>

<template>
  <NuxtLink to="/" class="d-flex align-center ma-0 text-primary text-decoration-none">
    <nuxt-img src="/linkfolio-wordmark.svg" :alt="t('common.logoAlt')" width="120" height="40" />
  </NuxtLink>
</template>

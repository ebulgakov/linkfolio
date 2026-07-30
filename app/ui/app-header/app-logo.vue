<script lang="ts" setup>
const { t } = useI18n();
</script>

<template>
  <NuxtLink to="/" class="d-flex align-center ma-0 text-primary text-decoration-none">
    <nuxt-img src="/linkfolio-logo.svg" :alt="t('common.logoAlt')" width="40" height="40" />
    <span class="mt-2 text-body-large">{{ t("common.appName") }}</span>
  </NuxtLink>
</template>

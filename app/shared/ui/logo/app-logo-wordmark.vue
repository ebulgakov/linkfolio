<script lang="ts" setup>
const { t } = useI18n();
</script>

<template>
  <NuxtLink to="/" class="d-flex align-baseline ma-0 ga-1 text-primary text-decoration-none">
    <nuxt-img
      provider="cloudinary"
      format="svg"
      src="/linkfolio-logo.svg"
      :alt="t('common.logoAlt')"
      width="40"
      height="40"
    />
    <nuxt-img
      provider="cloudinary"
      format="svg"
      src="/linkfolio-wordmark.svg"
      alt=""
      width="140"
      height="40"
    />
  </NuxtLink>
</template>

<script lang="ts" setup>
const { t } = useI18n();
</script>

<template>
  <NuxtLink to="/" class="d-block">
    <nuxt-img
      class="w-100"
      provider="cloudinary"
      format="svg"
      src="/linkfolio-logo.svg"
      :alt="t('common.logoAlt')"
    />
  </NuxtLink>
</template>

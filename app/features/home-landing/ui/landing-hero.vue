<script lang="ts" setup>
import { useLandingHero } from "../model/use-landing-hero";

import { AppLogo } from "~/shared/ui";

const { t } = useI18n();
const { loggedIn } = await useLandingHero();
</script>

<template>
  <div class="text-center py-8 py-sm-12">
    <AppLogo class="logo" />

    <h1 class="text-h4 text-sm-h3 font-weight-bold my-4">{{ t("pages.home.hero.title") }}</h1>

    <p class="text-body-1 text-medium-emphasis mx-auto mb-6" style="max-width: 560px">
      {{ t("pages.home.hero.subtitle") }}
    </p>

    <div v-if="!loggedIn" class="d-flex justify-center flex-wrap ga-3">
      <v-btn to="/signup" color="primary" variant="tonal" size="large">
        {{ t("pages.home.hero.ctaSignUp") }}
      </v-btn>
      <v-btn to="/login" color="primary" variant="outlined" size="large">
        {{ t("pages.home.hero.ctaLogIn") }}
      </v-btn>
    </div>
  </div>
</template>

<style lang="css" scoped>
.logo {
  display: block;
  margin: 0 auto;
  width: 100px;
}
</style>

<script lang="ts" setup>
import type { LocaleObject } from "@nuxtjs/i18n";

const { t, locale, locales, setLocale } = useI18n();

const availableLocales = computed(() => locales.value as LocaleObject[]);

async function onLocaleChange(code: string) {
  if (code && code !== locale.value) {
    await setLocale(code as "en" | "ru");
  }
}
</script>

<template>
  <v-footer app class="d-flex justify-center align-center">
    <v-btn-toggle
      :model-value="locale"
      mandatory
      density="compact"
      color="primary"
      @update:model-value="onLocaleChange"
    >
      <v-btn
        v-for="loc in availableLocales"
        :key="loc.code"
        :value="loc.code"
        :aria-label="`${t('footer.languageSwitcherLabel')}: ${loc.name}`"
        size="small"
      >
        {{ loc.name }}
      </v-btn>
    </v-btn-toggle>
  </v-footer>
</template>

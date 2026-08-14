<script lang="ts" setup>
import { useLocaleSwitcher } from "../model/use-locale-switcher";

const { t } = useI18n();
const { locale, availableLocales, onLocaleChange } = useLocaleSwitcher();
</script>

<template>
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
</template>

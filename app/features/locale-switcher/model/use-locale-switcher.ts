import { computed } from "vue";

import type { LocaleObject } from "@nuxtjs/i18n";

export function useLocaleSwitcher() {
  const { locale, locales, setLocale } = useI18n();

  const availableLocales = computed(() => locales.value as LocaleObject[]);

  async function onLocaleChange(code: string) {
    if (code && code !== locale.value) {
      await setLocale(code as "en" | "ru");
    }
  }

  return { locale, availableLocales, onLocaleChange };
}

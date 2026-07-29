export default defineNuxtPlugin(async nuxtApp => {
  const { locale, setLocale } = nuxtApp.$i18n;
  const localeCookie = useCookie<string>("i18n_locale", {
    default: () => "en",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax"
  });

  if (localeCookie.value !== locale.value && ["en", "ru"].includes(localeCookie.value)) {
    await setLocale(localeCookie.value as "en" | "ru");
  }

  if (import.meta.client) {
    watch(locale, newLocale => {
      localeCookie.value = newLocale;
    });
  }
});

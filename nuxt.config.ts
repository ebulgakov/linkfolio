// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  image: {
    cloudinary: {
      baseURL: "https://res.cloudinary.com/dwjzxeiqm/image/upload/v1785777412/linkfolio"
    }
  },

  modules: [
    "vuetify-nuxt-module",
    "@nuxt/eslint",
    "@nuxt/test-utils/module",
    "@sentry/nuxt/module",
    "@nuxt/image",
    "@nuxtjs/i18n",
    "nuxt-mcp-dev"
  ],

  css: ["@mdi/font/css/materialdesignicons.css"],

  i18n: {
    locales: [
      { code: "en", name: "English", file: "en.json" },
      { code: "ru", name: "Русский", file: "ru.json" }
    ],
    defaultLocale: "en",
    strategy: "no_prefix",
    detectBrowserLanguage: false
  },

  sentry: {
    org: "home-nbh",
    project: "linkfolio",
    autoInjectServerSentry: "top-level-import",
    sourcemaps: {
      filesToDeleteAfterUpload: [".output/**/public/**/*.map"]
    }
  },

  sourcemap: {
    client: "hidden"
  }
});

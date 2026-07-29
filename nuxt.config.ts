// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  modules: [
    "vuetify-nuxt-module",
    "@nuxt/eslint",
    "@nuxt/test-utils/module",
    "@sentry/nuxt/module"
  ],

  css: ["@mdi/font/css/materialdesignicons.css"],

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

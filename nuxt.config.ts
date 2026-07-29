// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  modules: [
    "@ant-design-vue/nuxt",
    "@nuxt/eslint",
    "@nuxt/test-utils/module",
    "@sentry/nuxt/module"
  ],

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

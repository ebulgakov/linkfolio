import type { StorybookConfig } from "@storybook-vue/nuxt";

const config: StorybookConfig = {
  stories: ["../app/**/*.mdx", "../app/**/*.stories.@(js|jsx|ts|tsx|mdx)"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs", "@chromatic-com/storybook"],
  framework: "@storybook-vue/nuxt",
  async viteFinal(config, { configType }) {
    if (configType === "PRODUCTION") {
      // Rolldown (Vite 8's default bundler, pulled in via Nuxt 4.5.1) doesn't preserve
      // module execution order during code-splitting by default, which breaks Storybook's
      // custom __STORYBOOK_MODULE_*__ global-based module loader in the static build.
      // https://github.com/vitejs/rolldown-vite/issues/562
      config.build ??= {};
      config.build.rolldownOptions ??= {};
      config.build.rolldownOptions.experimental = {
        ...config.build.rolldownOptions.experimental,
        strictExecutionOrder: true
      };
      config.build.rolldownOptions.output = {
        ...config.build.rolldownOptions.output,
        strictExecutionOrder: true
      };
    }

    // @storybook/builder-vite only adds story files to optimizeDeps.entries, not
    // preview.ts itself, so preview.ts's own imports get discovered mid-request on first
    // load instead of during Vite's cold-start scan — occasionally missing the resulting
    // full-reload and leaving the first story stuck. Pre-declare them so they're bundled
    // upfront. https://github.com/storybookjs/storybook/issues/33091
    config.optimizeDeps ??= {};
    config.optimizeDeps.include = [
      ...(config.optimizeDeps.include ?? []),
      "vuetify",
      "vuetify/components"
    ];

    return config;
  }
};
export default config;

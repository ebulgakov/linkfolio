import { setup } from "@storybook-vue/nuxt";
import { createVuetify } from "vuetify";
import { VApp } from "vuetify/components";

import type { Preview } from "@storybook-vue/nuxt";

// vuetify-nuxt-module's `app.use(createVuetify(...))` plugin runs as part of the real
// Nuxt app boot, which @storybook-vue/nuxt doesn't replicate — components auto-import
// and render fine, but no createVuetify() instance means no theme CSS variables get
// injected. Install it explicitly so stories pick up real Vuetify colors/theming.
setup(app => {
  app.use(createVuetify());
});

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    }
  },
  decorators: [
    story => ({
      components: { story, VApp },
      template: "<v-app><v-main><story /></v-main></v-app>"
    })
  ]
};

export default preview;

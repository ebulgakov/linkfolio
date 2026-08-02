# Installing Vuetify

Tooling commands shift over time — if any of this looks stale or fails, cross-check https://vuetifyjs.com/en/getting-started/installation/ before troubleshooting further.

## New project (scaffolding tool)

Fastest path — generates a ready-to-go Vite + Vuetify project:

```bash
pnpm create vuetify
# or: npm create vuetify@latest
# or: yarn create vuetify
```

Walks through project name, TypeScript y/n, and package manager, then scaffolds the app. `cd` into it and run the usual `dev` script.

## Existing Vite + Vue project (manual)

1. Install:

   ```bash
   npm install vuetify
   npm install -D vite-plugin-vuetify
   ```

2. `vite.config.ts`:

   ```ts
   import { defineConfig } from "vite";
   import vue from "@vitejs/plugin-vue";
   import vuetify, { transformAssetUrls } from "vite-plugin-vuetify";

   export default defineConfig({
     plugins: [
       vue({ template: { transformAssetUrls } }), // resolves asset URLs in Vuetify components like VImg
       vuetify({ autoImport: true }) // enables auto-import of components/directives
     ]
   });
   ```

3. Entry file (`main.ts` / `main.js`):

   ```ts
   import { createApp } from "vue";
   import App from "./App.vue";
   import { createVuetify } from "vuetify";
   import "vuetify/styles";
   import "@mdi/font/css/materialdesignicons.css"; // default icon set

   const vuetify = createVuetify();

   createApp(App).use(vuetify).mount("#app");
   ```

   If not using `vite-plugin-vuetify`'s `autoImport`, register components/directives explicitly instead:

   ```ts
   import * as components from "vuetify/components";
   import * as directives from "vuetify/directives";
   const vuetify = createVuetify({ components, directives });
   ```

## Nuxt 3 / 4

Preferred: the official Nuxt module, which handles the Vite plugin and SSR config for you.

```bash
npx nuxi module add vuetify-nuxt-module
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["vuetify-nuxt-module"],
  vuetify: {
    moduleOptions: {/* ... */},
    vuetifyOptions: {/* createVuetify() options */}
  }
});
```

Notes:

- Requires Nuxt's Vite builder (not Webpack).
- Don't also install `vite-plugin-vuetify` manually — the module errors if it finds one already configured.

Manual alternative (more control, more boilerplate): install `vuetify` + `vite-plugin-vuetify` as in the Vite section above, then wire the plugin into `nuxt.config.ts`'s `vite.plugins` / `hooks['vite:extendConfig']`, also setting `vite.vue.template.transformAssetUrls` from `vite-plugin-vuetify`'s `transformAssetUrls` export (same reason as the Vite section — otherwise assets in components like `VImg` can fail to resolve), and create the Vuetify instance in a `plugins/vuetify.ts` Nuxt plugin (auto-loaded on startup) instead of a `main.ts`. Also add `build: { transpile: ['vuetify'] }` and set `ssr: true` on `createVuetify()` — Nuxt won't detect SSR automatically.

## SSR note

Any SSR framework (Nuxt, Vitepress, etc.) needs:

```ts
const vuetify = createVuetify({ ssr: true });
```

## Icons

Vuetify needs an icon font/set. Common choices:

```bash
npm install @mdi/font        # Material Design Icons (default expected by most Vuetify snippets)
# or use @mdi/js for tree-shakeable SVG icons, or the icon set of your choice (fa, unplugin-icons, etc.)
```

## Version check before assuming any of this applies

This guide targets Vuetify 3.x on Vite/Nuxt. Vue CLI is Vuetify's legacy, maintenance-mode path (not the default anymore). Vuetify 2.x setup differs (different package structure, no `vite-plugin-vuetify`) — check `package.json` for the installed major version before applying these steps.

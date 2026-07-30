# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is pnpm (see `pnpm-lock.yaml` / `pnpm-workspace.yaml`).

- `pnpm install` — install dependencies (also runs `postinstall` → `nuxt prepare`)
- `pnpm dev` — start dev server at `http://localhost:3000`
- `pnpm build` — production build
- `pnpm generate` — static site generation
- `pnpm preview` — locally preview the production build
- `pnpm lint` / `pnpm lint:fix` — ESLint
- `pnpm format` / `pnpm format:fix` — Prettier
- `pnpm type-check` — `nuxt typecheck`
- `pnpm test` — run the Vitest suite (`vitest run`)

## Testing

- Vitest, configured for Nuxt via `@nuxt/test-utils` (`vitest.config.ts`: `environment: "nuxt"`). The `@nuxt/test-utils/module` is registered in `nuxt.config.ts`'s `modules` array — required for `mockNuxtImport` to resolve Nuxt auto-imports (e.g. `useRoute`, `navigateTo`) inside tests.
- Tests are colocated next to what they cover: `model/__tests__/use-x-form.test.ts`. Existing: `app/features/login/model/__tests__/use-login-form.test.ts`, `app/features/signup/model/__tests__/use-signup-form.test.ts`.
- Mock at the boundary, not internals: `authClient` via `vi.mock("~/shared/api/auth-client", ...)`; Nuxt auto-imports via `mockNuxtImport` with `vi.hoisted` mutable state boxes (the macro compiles to one hoisted `vi.mock` per import, so behavior varies per test by mutating the box, not by re-registering the mock). Never hit the real better-auth/Neon Auth endpoint from a unit test.
- The qa-specialist subagent owns writing/maintaining these tests — see `.claude/agents/qa-specialist.md` for conventions and priority targets.

## Architecture

Linkfolio is a Nuxt 4 application, organized with **Feature-Sliced Design** (FSD) under `app/`.

- `app/app.vue` — root component, renders `AppHeader` + `NuxtPage` + `AppFooter` (Nuxt 4 source directory convention: app code lives under `app/`, not the project root)
- `nuxt.config.ts` — Nuxt config; the `vuetify-nuxt-module` module is registered here, which auto-imports Vuetify components (e.g. `<v-btn>`, `<v-text-field>`, `<v-card>`) with no manual import needed
- UI library: **Vuetify** via `vuetify-nuxt-module` (icons: MDI webfont, `@mdi/font`)

### File naming

All files under `app/` use kebab-case — lowercase words separated by hyphens, no uppercase letters in the file name. This applies to every file type, including Vue components and composables: `ui/login-form.vue`, `model/use-login-form.ts`, `ui/app-header.vue`. The exported identifier/component name inside the file stays normal JS/Vue convention (PascalCase for components — `LoginForm`, `AppHeader` — camelCase for composables — `useLoginForm`) — only the on-disk file name is constrained to kebab-case.

### FSD layers in use

- `app/pages/` — route pages (`index.vue`, `login.vue`, `signup.vue`), thin — compose a feature's exported form component
- `app/ui/app-header/`, `app/ui/app-footer/` — app-wide layout, used only from `app.vue`, living in the app layer's own `ui` segment (not a `widgets` slice). Each groups a composition shell with its local, static presentational children (no logic): `app-header/app-header.vue` composes `AuthButtons` (feature) + local `app-header/app-logo.vue`; `app-footer/app-footer.vue` composes `LocaleSwitcher` (feature) + local `app-footer/footer-copyright.vue`/`app-footer/footer-links.vue`. `app.vue` imports the shell `.vue` files directly — no `index.ts` barrel, since the app layer isn't a slice and `app.vue` is the only consumer. These previously lived under `app/widgets/`, justified there as composing "multiple independent flows," but each only ever composed one feature — that's the litmus test for `widgets` (see `.claude/skills/feature-sliced-design/references/layer-structure.md`) vs. plain app-layer UI, and they didn't clear it. `app/widgets/` has been removed since nothing qualifies for it now; recreate it if a future case genuinely needs to compose multiple independent feature flows together
- `app/features/login/`, `app/features/signup/`, `app/features/locale-switcher/`, `app/features/auth-buttons/` — each slice exports a public API from `index.ts` (`export { default as XForm } from './ui/x-form.vue'` + a `useXForm` composable from `model/`). `model/use-x-form.ts` holds state/logic (form state + `authClient` calls, session fetch + logout, or locale switching) and does result handling; `ui/x-form.vue` is presentational only
- `app/shared/api/` — `auth-client.ts` (client-side singleton `authClient` from `better-auth/vue`, used in components like `app-header.vue`) and `use-auth.ts` (`useAuth()` factory that builds a **request-scoped** client with `baseURL` + forwarded cookies, needed for SSR contexts like route middleware — see `app/middleware/guest.ts`); both re-exported via `app/shared/api/index.ts`. `app/shared/ui/` and `app/shared/lib/` similarly re-export through their own `index.ts` — always import shared modules via these segment barrels (`~/shared/api`, `~/shared/ui`, `~/shared/lib`), not deep paths
- `app/middleware/guest.ts` — redirects an authenticated user away from `/login`/`/signup` to `/`; SSR-safe since it uses `useAuth()` rather than the module-level `authClient`

### Auth conventions (Better Auth via `better-auth/vue`)

- Neon Auth is Better Auth-based; there's no official Vue/Nuxt package, so this app talks to it directly through `better-auth/vue`'s client (not `@neondatabase/auth`, which only ships React/Next.js/vanilla-JS entry points)
- Two client instances exist deliberately: the singleton `authClient` (shared/api/auth-client.ts) for client-side reactive session state, and `useAuth()` (shared/api/use-auth.ts) whenever code must also run on the server (middleware, SSR data fetching) — pick based on whether the call site executes during SSR
- When reading the session in a component that renders during SSR, pin `authClient.useSession`'s `useFetch` key explicitly (see `app/features/auth-buttons/model/use-auth-buttons.ts`) to avoid a client/server key mismatch and hydration warning
- `use-auth-buttons.ts` awaits `authClient.useSession(...)` inside the composable itself (not inside the `.vue` file), so any other composable call that must resolve against the Nuxt instance (`useRouter()`, etc.) has to happen _before_ that `await`, not after — Vue's `<script setup>` compiler auto-restores the instance context around a top-level `await` via `withAsyncContext`, but that transform only applies inside an SFC's `<script setup>` block, not inside a plain `.ts` composable function. A call placed after the `await` there throws "called outside of a plugin/setup" once the logic is extracted out of the `.vue` file
- Any redirect target taken from a query param (e.g. `?redirect=`) must be sanitized to a same-origin path before use — see `sanitizeRedirect` in `use-login-form.ts` (exported for direct unit testing) — to avoid an open-redirect vector
- Database: **Neon serverless Postgres** (`@neondatabase/serverless`), project "Linkfolio". `.neon` holds the linked `orgId`/`projectId`; run `npx neon env pull` after switching branches/projects to refresh `.env` (gitignored) with `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED` (direct), `NEON_BRANCH`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL` — never expose these to client-side code.
  - No ORM is set up yet. Per the bundled Neon skill guidance (`.claude/skills/neon-postgres/SKILL.md`), pair Neon with an ORM such as Drizzle for schema/migrations rather than running ad hoc migrations, and use `DATABASE_URL` (pooled) for application queries, `DATABASE_URL_UNPOOLED` for migrations/admin tasks.

## Subagents

Specialist subagents live in `.claude/agents/`. `team-lead` is the entry point for any non-trivial feature request — it decomposes work and routes it to the others rather than writing code itself.

- **team-lead** — orchestrator; breaks down multi-area work and delegates to the specialists below.
- **fsd-architect** — Feature-Sliced Design layer/slice decisions, entity and data-model design, API contracts between frontend and server. Consult first for any new feature.
- **backend** — everything under `server/`: Nitro routes, Neon Postgres schema/migrations (Drizzle), API endpoints, auth/session handling.
- **vue-specialist** — Vue 3 components and composables inside FSD `ui/`/`model/` segments, Vuetify usage.
- **nuxt-integrator** — `nuxt.config.ts`, modules, routing/pages, data fetching (`useFetch`/`useAsyncData`), middleware, plugins, SSR/hydration.
- **qa-specialist** — writes/updates tests for components and composables after they're implemented; use PROACTIVELY once a component or composable lands.
- **devops-ci** — GitHub Actions, deploy configuration (Vercel), environment/secrets management, PR preview deploys.

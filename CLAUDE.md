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

There is no test suite configured in this repo yet; the qa-specialist subagent owns setting one up (Vitest + `@nuxt/test-utils`) when it's next needed.

## Architecture

Linkfolio is a Nuxt 4 application, organized with **Feature-Sliced Design** (FSD) under `app/`.

- `app/app.vue` — root component, renders `Header` widget + `NuxtPage` (Nuxt 4 source directory convention: app code lives under `app/`, not the project root)
- `nuxt.config.ts` — Nuxt config; the `@ant-design-vue/nuxt` module is registered here, which auto-imports Ant Design Vue components (e.g. `<a-button>`, `<a-flex>`, `<a-slider>`) with no manual import needed
- UI library: **Ant Design Vue** via `@ant-design-vue/nuxt`

### FSD layers in use

- `app/pages/` — route pages (`index.vue`, `login.vue`, `signup.vue`), thin — compose a feature's exported form component
- `app/widgets/header/` — `Header.vue` shows the session (name/email + Log Out) or nothing for guests; exported via `index.ts`
- `app/features/login/`, `app/features/signup/` — each slice exports a public API from `index.ts` (`export { default as XForm } from './ui/XForm.vue'` + a `useXForm` composable from `model/`). `model/useXForm.ts` holds form state, calls `authClient`, and does result handling; `ui/XForm.vue` is presentational only
- `app/shared/api/` — `auth-client.ts` (client-side singleton `authClient` from `better-auth/vue`, used in components like `Header.vue`) and `use-auth.ts` (`useAuth()` factory that builds a **request-scoped** client with `baseURL` + forwarded cookies, needed for SSR contexts like route middleware — see `app/middleware/guest.ts`)
- `app/middleware/guest.ts` — redirects an authenticated user away from `/login`/`/signup` to `/`; SSR-safe since it uses `useAuth()` rather than the module-level `authClient`

### Auth conventions (Better Auth via `better-auth/vue`)

- Neon Auth is Better Auth-based; there's no official Vue/Nuxt package, so this app talks to it directly through `better-auth/vue`'s client (not `@neondatabase/auth`, which only ships React/Next.js/vanilla-JS entry points)
- Two client instances exist deliberately: the singleton `authClient` (shared/api/auth-client.ts) for client-side reactive session state, and `useAuth()` (shared/api/use-auth.ts) whenever code must also run on the server (middleware, SSR data fetching) — pick based on whether the call site executes during SSR
- When reading the session in a component that renders during SSR, pin `authClient.useSession`'s `useFetch` key explicitly (see `Header.vue`) to avoid a client/server key mismatch and hydration warning
- Any redirect target taken from a query param (e.g. `?redirect=`) must be sanitized to a same-origin path before use — see `sanitizeRedirect` in `useLoginForm.ts` — to avoid an open-redirect vector
- Database: **Neon serverless Postgres** (`@neondatabase/serverless`), project "Linkfolio". `.neon` holds the linked `orgId`/`projectId`; run `npx neon env pull` after switching branches/projects to refresh `.env` (gitignored) with `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED` (direct), `NEON_BRANCH`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL` — never expose these to client-side code.
  - No ORM is set up yet. Per the bundled Neon skill guidance (`.claude/skills/neon-postgres/SKILL.md`), pair Neon with an ORM such as Drizzle for schema/migrations rather than running ad hoc migrations, and use `DATABASE_URL` (pooled) for application queries, `DATABASE_URL_UNPOOLED` for migrations/admin tasks.

## Subagents

Specialist subagents live in `.claude/agents/`. `team-lead` is the entry point for any non-trivial feature request — it decomposes work and routes it to the others rather than writing code itself.

- **team-lead** — orchestrator; breaks down multi-area work and delegates to the specialists below.
- **fsd-architect** — Feature-Sliced Design layer/slice decisions, entity and data-model design, API contracts between frontend and server. Consult first for any new feature.
- **backend** — everything under `server/`: Nitro routes, Neon Postgres schema/migrations (Drizzle), API endpoints, auth/session handling.
- **vue-specialist** — Vue 3 components and composables inside FSD `ui/`/`model/` segments, Ant Design Vue usage.
- **nuxt-integrator** — `nuxt.config.ts`, modules, routing/pages, data fetching (`useFetch`/`useAsyncData`), middleware, plugins, SSR/hydration.
- **qa-specialist** — writes/updates tests for components and composables after they're implemented; use PROACTIVELY once a component or composable lands.

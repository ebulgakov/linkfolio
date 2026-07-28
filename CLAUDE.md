# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is pnpm (see `pnpm-lock.yaml` / `pnpm-workspace.yaml`).

- `pnpm install` — install dependencies (also runs `postinstall` → `nuxt prepare`)
- `pnpm dev` — start dev server at `http://localhost:3000`
- `pnpm build` — production build
- `pnpm generate` — static site generation
- `pnpm preview` — locally preview the production build

There is no test suite or linter configured in this repo yet.

## Architecture

Linkfolio is a Nuxt 4 application, currently at an early scaffold stage.

- `app/app.vue` — root component (Nuxt 4 source directory convention: app code lives under `app/`, not the project root)
- `nuxt.config.ts` — Nuxt config; the `@ant-design-vue/nuxt` module is registered here, which auto-imports Ant Design Vue components (e.g. `<a-button>`, `<a-flex>`, `<a-slider>`) with no manual import needed
- UI library: **Ant Design Vue** via `@ant-design-vue/nuxt`
- Database: **Neon serverless Postgres** (`@neondatabase/serverless`), project "Linkfolio". `.neon` holds the linked `orgId`/`projectId`; run `npx neon env pull` after switching branches/projects to refresh `.env` (gitignored) with `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED` (direct), `NEON_BRANCH`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL` — never expose these to client-side code.
  - No ORM is set up yet. Per the bundled Neon skill guidance (`.claude/skills/neon-postgres/SKILL.md`), pair Neon with an ORM such as Drizzle for schema/migrations rather than running ad hoc migrations, and use `DATABASE_URL` (pooled) for application queries, `DATABASE_URL_UNPOOLED` for migrations/admin tasks.
  - **Neon Auth** is provisioned on the backend (Better Auth-based, JWKS/base URL in `.env`), but there is no auth UI wired up yet: `@neondatabase/auth` only ships React/Next.js/vanilla-JS entry points, no official Vue/Nuxt integration. Building the sign-in flow will require either the package's `./vanilla` entry point or Better Auth's own Vue client (`better-auth/vue`) pointed at the Neon-hosted endpoints — both unofficial pairings, pick one deliberately rather than assuming first-party Nuxt support exists.

## Subagents

Specialist subagents live in `.claude/agents/`. `team-lead` is the entry point for any non-trivial feature request — it decomposes work and routes it to the others rather than writing code itself.

- **team-lead** — orchestrator; breaks down multi-area work and delegates to the specialists below.
- **fsd-architect** — Feature-Sliced Design layer/slice decisions, entity and data-model design, API contracts between frontend and server. Consult first for any new feature.
- **backend** — everything under `server/`: Nitro routes, Neon Postgres schema/migrations (Drizzle), API endpoints, auth/session handling.
- **vue-specialist** — Vue 3 components and composables inside FSD `ui/`/`model/` segments, Ant Design Vue usage.
- **nuxt-integrator** — `nuxt.config.ts`, modules, routing/pages, data fetching (`useFetch`/`useAsyncData`), middleware, plugins, SSR/hydration.

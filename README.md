# Linkfolio

Linkfolio is a Nuxt app for building collections of links and sharing them via a public slug — optionally password-protected — with automatic link-preview scraping.

## Tech stack

- [Nuxt 4](https://nuxt.com) / Vue 3, TypeScript
- [Vuetify](https://vuetifyjs.com) (via `vuetify-nuxt-module`) — UI
- [Neon](https://neon.tech) Serverless Postgres + [Drizzle ORM](https://orm.drizzle.team) — database
- [Better Auth](https://better-auth.com) (`better-auth/vue`), proxied to Neon Auth — authentication
- [`@nuxtjs/i18n`](https://i18n.nuxtjs.org) — English/Russian
- [`@sentry/nuxt`](https://docs.sentry.io/platforms/javascript/guides/nuxt/) — error monitoring
- Vitest + `@nuxt/test-utils` — testing
- ESLint + Prettier + Husky/lint-staged — linting, formatting, pre-commit hooks

## Prerequisites

- Node version pinned in [`.nvmrc`](./.nvmrc) — run `nvm use`
- [pnpm](https://pnpm.io) (see `pnpm-lock.yaml`)
- A [Neon](https://neon.tech) account/project (for Postgres + Neon Auth)

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Set up environment variables. Either copy `.env.example` to `.env` and fill in the values from the Neon console, or, if the project is already linked (see `.neon`), pull them automatically:

   ```bash
   npx neon env pull
   ```

   | Variable                | Purpose                                                         |
   | ----------------------- | --------------------------------------------------------------- |
   | `DATABASE_URL`          | Pooled Postgres connection, used by the app at runtime          |
   | `DATABASE_URL_UNPOOLED` | Direct Postgres connection, used for Drizzle migrations         |
   | `NEON_BRANCH`           | Linked Neon branch name                                         |
   | `NEON_AUTH_BASE_URL`    | Neon Auth backend URL, proxied by `server/api/auth/[...all].ts` |
   | `NEON_AUTH_JWKS_URL`    | Neon Auth JWKS endpoint                                         |
   | `BETTER_AUTH_API_KEY`   | Neon Auth API key                                               |

   These values are project secrets — never expose them to client-side code.

3. Run database migrations:

   ```bash
   pnpm db:migrate
   ```

   (`pnpm db:generate` regenerates migration files after changing `server/db/schema.ts`.)

4. (Optional) Sentry source map uploads. `pnpm build` uploads source maps via `@sentry/nuxt`'s build plugin, which needs an auth token separate from `.env`. Copy `.env.sentry-build-plugin.example` to `.env.sentry-build-plugin` and set `SENTRY_AUTH_TOKEN` (from Sentry → org "home-nbh" → project "linkfolio"). Not required for `pnpm dev`.

## Development server

Start the development server on `http://localhost:3000`:

```bash
pnpm dev
```

## Testing

```bash
pnpm test
```

## Linting, formatting, type-checking

```bash
pnpm lint        # or lint:fix
pnpm format      # or format:fix
pnpm type-check
```

## Production

Build the application for production:

```bash
pnpm build
```

Locally preview the production build:

```bash
pnpm preview
```

Or generate a static build:

```bash
pnpm generate
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Project structure

The app follows [Feature-Sliced Design](https://feature-sliced.design) under `app/`, with a full CRUD API for collections, links, and sharing under `server/api/`. See [`CLAUDE.md`](./CLAUDE.md) for detailed architecture and conventions.

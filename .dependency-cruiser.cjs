/**
 * dependency-cruiser config.
 *
 * Deliberately narrow scope — this exists to cover exactly what
 * eslint-plugin-boundaries (eslint.config.mjs) cannot reach:
 *   - eslint-plugin-boundaries is hard-scoped to `app/**` and can't see
 *     `server/**` at all, so nothing today stops an accidental
 *     app <-> server static import.
 *   - eslint-plugin-boundaries checks layer edges, not circular imports.
 *
 * Coverage is intentionally partial on the server side: Nitro auto-imports
 * `server/utils/*` into `server/api/**` route handlers with no explicit
 * import statement, so this config can verify `db`/`utils` never reach
 * back up into `api`, but cannot verify the `api -> utils`/`api -> db`
 * edges exist or are well-formed — that traffic is invisible to static
 * analysis. App-side coverage is more complete because FSD's barrel-import
 * convention (`import { x } from "~/features/y"`) is explicit.
 *
 * Orphan-module detection is deliberately NOT enabled: Nuxt auto-imports
 * composables/components repo-wide and Nitro auto-imports server/utils/*,
 * so "unreferenced by a static import" does not reliably mean "unused"
 * anywhere in this repo.
 */
const path = require("node:path");

module.exports = {
  forbidden: [
    {
      name: "no-circular",
      severity: "error",
      comment: "Circular imports aren't caught by eslint-plugin-boundaries.",
      from: {},
      to: { circular: true }
    },
    {
      name: "app-not-to-server",
      severity: "error",
      comment:
        "eslint-plugin-boundaries only scopes app/**, so nothing else stops app/ from statically importing server/.",
      from: { path: "^app/" },
      to: { path: "^server/" }
    },
    {
      name: "server-not-to-app",
      severity: "error",
      comment: "Server code must not import from the client app tree.",
      from: { path: "^server/" },
      to: { path: "^app/" }
    },
    {
      name: "server-db-no-upward",
      severity: "error",
      comment:
        "server/db is the schema/client layer; it must not import server/api or server/utils. Near-unviolatable in practice since nothing in server/db writes explicit local imports today - this is a ratchet, not a rule catching an active problem.",
      from: { path: "^server/db/" },
      to: { path: "^server/(api|utils)/" }
    },
    {
      name: "server-utils-not-to-api",
      severity: "error",
      comment:
        "server/utils are Nitro-auto-imported helpers; they must not import server/api route handlers. Cannot verify the reverse (api -> utils) edge since Nitro's auto-import is invisible to static analysis.",
      from: { path: "^server/utils/" },
      to: { path: "^server/api/" }
    },
    {
      name: "not-to-unresolvable",
      severity: "error",
      comment:
        "Canary against a misconfigured resolver silently resolving nothing, which would make every other rule here pass green while checking nothing. Excludes '#'-prefixed specifiers (Nuxt's own virtual/generated aliases, e.g. #components - not real files any resolver could find on disk) and the bare 'h3' package (a transitive Nitro dependency used only for `import type`, not declared in package.json, so pnpm's strict isolation hides it from this file-based resolver even though TypeScript itself resolves it fine via Nitro's generated tsconfig).",
      from: {},
      to: { couldNotResolve: true, pathNot: "^#|^h3$" }
    }
  ],
  options: {
    // Aliases are resolved via webpackConfig (see
    // .dependency-cruiser.webpack-resolve.cjs), not tsConfig: this repo's
    // TypeScript 6.0.3 install breaks dependency-cruiser 18.2.0's
    // tsConfig-based path resolution (verified empirically - every `~`/`~~`
    // import came back couldNotResolve even with a correct paths block and
    // an explicit baseUrl).
    webpackConfig: {
      // Must be absolute: a relative fileName does not resolve against the
      // repo root the way the CLI docs imply (verified empirically).
      fileName: path.join(__dirname, ".dependency-cruiser.webpack-resolve.cjs")
    },
    enhancedResolveOptions: {
      // better-auth (and other modern deps) expose subpath imports (e.g.
      // "better-auth/vue") only via package.json's `exports` field; without
      // this, those come back couldNotResolve too.
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"]
    },
    // Without this, `import type { X } from "..."` is invisible to every
    // rule above - including app-not-to-server/server-not-to-app, which
    // exist specifically to catch app<->server coupling. A type-only
    // import (e.g. reusing a Drizzle-inferred type from server/db/schema.ts
    // instead of hand-declaring it) is the realistic way that coupling
    // would actually happen in this stack.
    tsPreCompilationDeps: true,
    exclude: {
      path: "(^|/)(__tests__|node_modules)/|\\.stories\\.ts$|^\\.nuxt/"
    },
    doNotFollow: {
      path: "node_modules"
    }
  }
};

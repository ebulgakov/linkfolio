import { defineVitestConfig } from "@nuxt/test-utils/config";
import { configDefaults } from "vitest/config";

export default defineVitestConfig({
  test: {
    environment: "nuxt",
    // Vitest's default include already matches `*.spec.ts` — exclude e2e/ so
    // `pnpm test` doesn't try to run the Playwright specs living there.
    exclude: [...configDefaults.exclude, "e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["app/**/*.{ts,vue}", "server/**/*.ts"],
      exclude: [
        "**/*.stories.ts",
        "**/__tests__/**",
        "app/shared/testing/**",
        "server/db/migrations/**",
        "**/*.d.ts",
        "nuxt.config.ts",
        "vitest.config.ts",
        "drizzle.config.ts"
      ],
      // Floor only — raise after a real coverage improvement, never lower to pass a red PR.
      thresholds: {
        statements: 41.3,
        branches: 42.7,
        functions: 31.6,
        lines: 43.0
      }
    }
  }
});

import { defineVitestConfig } from "@nuxt/test-utils/config";

export default defineVitestConfig({
  test: {
    environment: "nuxt",
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
        statements: 39.2,
        branches: 42.5,
        functions: 28.8,
        lines: 40.7
      }
    }
  }
});

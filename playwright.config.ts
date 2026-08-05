import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

// Local-only; CI supplies these as job env from GitHub Actions secrets.
loadEnv({ path: ".env.e2e.local" });

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  use: {
    baseURL: "http://localhost:3000",
    viewport: { width: 1280, height: 800 },
    trace: "retain-on-failure"
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    // Merged into process.env for the spawned `pnpm dev` process — overrides
    // the ambient (prod-pointing) .env's DATABASE_URL with the e2e branch's,
    // sourced from a distinctly-named var so the two can never be confused.
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "",
      NEON_AUTH_BASE_URL: process.env.NEON_AUTH_BASE_URL ?? "",
      NEON_AUTH_JWKS_URL: process.env.NEON_AUTH_JWKS_URL ?? "",
      BETTER_AUTH_API_KEY: process.env.BETTER_AUTH_API_KEY ?? ""
    }
  }
});

import { expect, test } from "@playwright/test";

// KNOWN LIMITATION (accepted): Neon Auth (NEON_AUTH_BASE_URL/JWKS_URL) is
// project-scoped, not per-branch — signups here go through the same auth
// backend as prod, so every run leaves a row in *prod*'s neon_auth.user
// table (Postgres app data on the e2e-test branch is still fully
// isolated/reset — see scripts/neon-test-branch.mts). Run
// `pnpm cleanup:e2e-users` periodically (dry-run by default) to remove them
// — see scripts/cleanup-e2e-users.mjs. True isolation would require a
// separate Neon project (own Neon Auth provisioning) — deliberately not
// done, see PR #55 discussion.
test("user can sign up, log out, and log back in", async ({ page }) => {
  const email = `e2e-${Date.now()}@linkfolio-e2e.test`;
  const password = "e2e-test-password-1";

  await page.goto("/signup");
  // Nuxt hydration must finish before the form's @submit.prevent handler is
  // bound — clicking too early falls back to a native form GET, reloading
  // /signup instead of calling the signup API.
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  await expect(page).toHaveURL("/collections");

  await page.getByRole("button", { name: "Log Out" }).click();
  await expect(page).toHaveURL("/login");

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL("/collections");
});

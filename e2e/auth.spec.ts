import { expect, test } from "@playwright/test";

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

import { neon } from "@neondatabase/serverless";
import { expect, test } from "@playwright/test";

// KNOWN LIMITATION (accepted, same as e2e/auth.spec.ts): Neon Auth is
// project-scoped, not per-branch — this test's signup/reset go through the
// same auth backend as prod, leaving rows in prod's neon_auth.user /
// neon_auth.verification tables. There is no local email hook to intercept
// (server/api/auth/[...all].ts only proxies to NEON_AUTH_BASE_URL) — the
// reset token is read directly from neon_auth.verification instead of
// following a real email link. See PR discussion referenced in auth.spec.ts.
test("user can reset their password via a forgot-password link and log in with it", async ({
  page
}) => {
  const email = `e2e-${Date.now()}@linkfolio-e2e.test`;
  const password = "e2e-test-password-1";
  const newPassword = "e2e-test-password-2";

  await page.goto("/signup");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign up", exact: true }).click();
  await expect(page).toHaveURL("/collections");

  await page.getByRole("button", { name: "Log Out" }).click();
  await expect(page).toHaveURL("/login");

  await page.goto("/forgot-password");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(
    page.getByText("If an account exists for that email, we've sent a link to reset your password.")
  ).toBeVisible();

  // Neon Auth is project-scoped, not per-branch (see header comment above),
  // so neon_auth.user/neon_auth.verification only have real rows on the
  // project's default branch — query DATABASE_URL here, not
  // TEST_DATABASE_URL (that branch's neon_auth schema is always empty).
  const sql = neon(process.env.DATABASE_URL!);
  const [row] = await sql`
    select v.identifier
    from neon_auth.verification v
    join neon_auth.user u on u.id::text = v.value
    where u.email = ${email} and v.identifier like 'reset-password:%'
    order by v."createdAt" desc
    limit 1
  `;
  const token = (row.identifier as string).replace("reset-password:", "");

  await page.goto(`/reset-password?token=${token}`);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Password").fill(newPassword);
  await page.getByRole("button", { name: "Reset password" }).click();
  await expect(page.getByText("Your password has been reset. You can now log in.")).toBeVisible();

  await page.getByRole("link", { name: "Go to log in" }).click();
  await expect(page).toHaveURL("/login");

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(newPassword);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL("/collections");
});

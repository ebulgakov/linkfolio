#!/usr/bin/env node
// Manual, on-demand cleanup for the prod pollution documented in
// e2e/auth.spec.ts: Neon Auth is project-scoped, not per-branch, so every
// e2e run's signup lands a real row in *prod*'s neon_auth.user table. This
// finds and deletes those rows (tagged with the "@linkfolio-e2e.test" email
// suffix) via Neon's own auth-user-delete API (cascades sessions/accounts
// server-side — safer than raw SQL against neon_auth's internal tables).
//
// Deliberately NOT wired into e2e/global-teardown.ts: this touches prod on
// purpose, so it stays a separate, human-triggered step. Dry-run by default.
//
// Usage:
//   pnpm cleanup:e2e-users          # list matching users, delete nothing
//   pnpm cleanup:e2e-users -- --yes # actually delete them
import { neon } from "@neondatabase/serverless";
import { config as loadEnv } from "dotenv";

// Prod DATABASE_URL comes from the regular .env; NEON_API_KEY is layered in
// from .env.e2e.local so it doesn't need duplicating into .env.
loadEnv();
loadEnv({ path: ".env.e2e.local", override: false });

const EMAIL_SUFFIX = "@linkfolio-e2e.test";
const NEON_API_BASE = "https://console.neon.tech/api/v2";
const NEON_PROJECT_ID = "gentle-bird-86757258";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

async function neonApi(path, init = {}) {
  const apiKey = requireEnv("NEON_API_KEY");
  const response = await fetch(`${NEON_API_BASE}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
      ...init.headers
    }
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Neon API ${init.method ?? "GET"} ${path} failed (${response.status}): ${body}`
    );
  }
  return response.status === 204 ? null : response.json();
}

async function findDefaultBranchId() {
  const { branches } = await neonApi(`/projects/${NEON_PROJECT_ID}/branches`);
  const defaultBranch = branches.find(branch => branch.default);
  if (!defaultBranch) {
    throw new Error(
      "No default branch found on project — Neon Auth's own branch must be passed explicitly"
    );
  }
  return defaultBranch.id;
}

async function main() {
  const dryRun = !process.argv.includes("--yes");
  const databaseUrl = requireEnv("DATABASE_URL");

  const sql = neon(databaseUrl);
  const rows =
    await sql`select id, email from neon_auth.user where email like ${"%" + EMAIL_SUFFIX}`;

  if (rows.length === 0) {
    console.log("No e2e test users found in prod.");
    return;
  }

  console.log(`Found ${rows.length} e2e test user(s) in prod:`);
  for (const row of rows) {
    console.log(`  ${row.email} (${row.id})`);
  }

  if (dryRun) {
    console.log("\nDry run — nothing deleted. Re-run with `-- --yes` to actually delete these.");
    return;
  }

  const branchId = await findDefaultBranchId();
  for (const row of rows) {
    await neonApi(`/projects/${NEON_PROJECT_ID}/branches/${branchId}/auth/users/${row.id}`, {
      method: "DELETE"
    });
    console.log(`Deleted ${row.email}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});

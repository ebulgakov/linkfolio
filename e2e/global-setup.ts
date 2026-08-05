import { neon } from "@neondatabase/serverless";

import { resetTestBranch } from "../scripts/neon-test-branch.mts";

// Guards against ever running e2e tests against the wrong database: after
// resetting, confirm TEST_DATABASE_URL actually points at the dedicated e2e
// branch (not a developer's prod-pointing DATABASE_URL) before any test runs.
async function assertConnectedToTestBranch(): Promise<void> {
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  const expectedBranchId = process.env.NEON_TEST_BRANCH_ID;
  if (!testDatabaseUrl || !expectedBranchId) {
    throw new Error("TEST_DATABASE_URL / NEON_TEST_BRANCH_ID must be set before running e2e tests");
  }

  const sql = neon(testDatabaseUrl);
  const [row] = await sql`select current_setting('neon.branch_id', true) as branch_id`;
  if (row?.branch_id !== expectedBranchId) {
    throw new Error(
      `TEST_DATABASE_URL does not point at the e2e test branch (expected ${expectedBranchId}, got ${row?.branch_id}) — refusing to run e2e tests against the wrong database`
    );
  }
}

export default async function globalSetup(): Promise<void> {
  await resetTestBranch();
  await assertConnectedToTestBranch();
}

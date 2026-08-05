import { resetTestBranch } from "../scripts/neon-test-branch.mts";

// Runs after every Playwright run — pass or fail — so the e2e branch never
// carries leftover test data between runs.
export default async function globalTeardown(): Promise<void> {
  await resetTestBranch();
}

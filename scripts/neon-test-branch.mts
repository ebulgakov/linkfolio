// Resets the dedicated e2e Neon branch (NEON_TEST_BRANCH_ID) back to the
// current state of the production branch (NEON_RESET_SOURCE_BRANCH_ID) via
// Neon's branch-restore API. Used by e2e/global-setup.ts and
// e2e/global-teardown.ts so the test branch starts and ends every Playwright
// run clean, regardless of whether the tests passed.
//
// This copies prod's Postgres data (collections/urls/etc.) into e2e-test on
// every reset — accepted tradeoff, isolated storage that never writes back to
// prod. Auth is a separate story: Neon Auth is project-scoped, not
// per-branch, so signups during the test still land in *prod*'s
// neon_auth.user table regardless of this reset — see e2e/auth.spec.ts.
const NEON_API_BASE = "https://console.neon.tech/api/v2";
const NEON_PROJECT_ID = "gentle-bird-86757258";

interface NeonOperation {
  id: string;
  status: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set — required to reset the e2e Neon test branch`);
  }
  return value;
}

async function neonApi<T>(path: string, init: RequestInit = {}): Promise<T> {
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
  return response.json() as Promise<T>;
}

async function waitForOperation(operation: NeonOperation): Promise<void> {
  let status = operation.status;
  while (status !== "finished") {
    if (status === "failed" || status === "error") {
      throw new Error(`Neon operation ${operation.id} ${status}`);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    const { operation: refreshed } = await neonApi<{ operation: NeonOperation }>(
      `/projects/${NEON_PROJECT_ID}/operations/${operation.id}`
    );
    status = refreshed.status;
  }
}

export async function resetTestBranch(): Promise<void> {
  const branchId = requireEnv("NEON_TEST_BRANCH_ID");
  const sourceBranchId = requireEnv("NEON_RESET_SOURCE_BRANCH_ID");

  const { operations } = await neonApi<{ operations: NeonOperation[] }>(
    `/projects/${NEON_PROJECT_ID}/branches/${branchId}/restore`,
    {
      method: "POST",
      body: JSON.stringify({ source_branch_id: sourceBranchId })
    }
  );

  await Promise.all(operations.map(waitForOperation));
}

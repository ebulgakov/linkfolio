import { vi } from "vitest";

// Mock only unlockSharedCollection (the network-calling export used by
// use-collection-unlock.ts) and keep everything else in the module real.
const unlockSharedCollectionMock = vi.hoisted(() => vi.fn());

export { unlockSharedCollectionMock };

vi.mock("~/shared/api/shared-collections", async importOriginal => {
  const actual = await importOriginal<typeof import("~/shared/api/shared-collections")>();
  return {
    ...actual,
    unlockSharedCollection: unlockSharedCollectionMock
  };
});

export function resetSharedCollectionsApiMocks() {
  unlockSharedCollectionMock.mockReset();
}

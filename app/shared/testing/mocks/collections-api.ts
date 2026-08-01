import { vi } from "vitest";

// Mock only the network-calling exports of ~/shared/api/collections
// (createCollection/updateCollection/checkSlugAvailability) and keep
// everything else - crucially `extractFieldErrors` - real. use-collection-form.ts
// relies on the actual `extractFieldErrors` implementation to map a 23505
// unique-violation error body into field errors; stubbing the whole module
// would make that mapping untestable (a mocked `extractFieldErrors` returning
// `undefined` would make the test vacuous).
const createCollectionMock = vi.hoisted(() => vi.fn());
const updateCollectionMock = vi.hoisted(() => vi.fn());
const deleteCollectionMock = vi.hoisted(() => vi.fn());
const checkSlugAvailabilityMock = vi.hoisted(() => vi.fn());

export {
  createCollectionMock,
  updateCollectionMock,
  deleteCollectionMock,
  checkSlugAvailabilityMock
};

vi.mock("~/shared/api/collections", async importOriginal => {
  const actual = await importOriginal<typeof import("~/shared/api/collections")>();
  return {
    ...actual,
    createCollection: createCollectionMock,
    updateCollection: updateCollectionMock,
    deleteCollection: deleteCollectionMock,
    checkSlugAvailability: checkSlugAvailabilityMock
  };
});

export function resetCollectionsApiMocks() {
  createCollectionMock.mockReset();
  updateCollectionMock.mockReset();
  deleteCollectionMock.mockReset();
  checkSlugAvailabilityMock.mockReset();
}

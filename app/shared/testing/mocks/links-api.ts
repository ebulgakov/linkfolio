import { vi } from "vitest";

// Mock only the network-calling exports of ~/shared/api/links
// (createLink/updateLink/deleteLink/fetchLinkPreview) and keep everything
// else - crucially `extractLinkFieldErrors` - real. use-link-form.ts relies
// on the actual `extractLinkFieldErrors` implementation to map a validation
// error body into field errors; stubbing the whole module would make that
// mapping untestable (a mocked `extractLinkFieldErrors` returning `undefined`
// would make the test vacuous).
const createLinkMock = vi.hoisted(() => vi.fn());
const updateLinkMock = vi.hoisted(() => vi.fn());
const deleteLinkMock = vi.hoisted(() => vi.fn());
const fetchLinkPreviewMock = vi.hoisted(() => vi.fn());

export { createLinkMock, updateLinkMock, deleteLinkMock, fetchLinkPreviewMock };

vi.mock("~/shared/api/links", async importOriginal => {
  const actual = await importOriginal<typeof import("~/shared/api/links")>();
  return {
    ...actual,
    createLink: createLinkMock,
    updateLink: updateLinkMock,
    deleteLink: deleteLinkMock,
    fetchLinkPreview: fetchLinkPreviewMock
  };
});

export function resetLinksApiMocks() {
  createLinkMock.mockReset();
  updateLinkMock.mockReset();
  deleteLinkMock.mockReset();
  fetchLinkPreviewMock.mockReset();
}

import { vi } from "vitest";

// Mock only the network-calling exports of ~/shared/api/uploads
// (uploadImage/deleteUploadedImage) - the boundary use-image-upload.ts calls
// through. Nothing else in that module needs stubbing, but importOriginal is
// kept anyway for consistency with the other ~/shared/api/* mocks (and in
// case a non-network export is ever added here).
const uploadImageMock = vi.hoisted(() => vi.fn());
const deleteUploadedImageMock = vi.hoisted(() => vi.fn());

export { uploadImageMock, deleteUploadedImageMock };

vi.mock("~/shared/api/uploads", async importOriginal => {
  const actual = await importOriginal<typeof import("~/shared/api/uploads")>();
  return {
    ...actual,
    uploadImage: uploadImageMock,
    deleteUploadedImage: deleteUploadedImageMock
  };
});

export function resetUploadsApiMocks() {
  uploadImageMock.mockReset();
  deleteUploadedImageMock.mockReset();
}

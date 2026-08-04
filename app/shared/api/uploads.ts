export interface UploadImageResult {
  url: string;
}

/**
 * Sends the raw `File`/`Blob` as the request body - deliberately NOT
 * wrapped in `FormData` or JSON/base64. ofetch passes a File/Blob body
 * straight through to the underlying `fetch`, which derives the
 * `Content-Type` header from `file.type` on its own. This matches the fixed
 * server contract for `POST /api/upload/image` exactly - do not change this
 * to a FormData body.
 */
export function uploadImage(file: File): Promise<UploadImageResult> {
  return $fetch<UploadImageResult>("/api/upload/image", {
    method: "POST",
    body: file
  });
}

export async function deleteUploadedImage(url: string): Promise<void> {
  // Widen to `string` explicitly: Nitro's typed-fetch route matching only
  // knows this route as POST until the backend's DELETE handler file lands
  // and typegen picks it up, so a literal "DELETE" method is rejected by the
  // generated types even though the server route supports it - see
  // deleteCollection in collections.ts for the same issue.
  const endpoint: string = "/api/upload/image";
  await $fetch(endpoint, { method: "DELETE", query: { url } });
}

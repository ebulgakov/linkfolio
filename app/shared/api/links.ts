export interface LinkItem {
  id: string;
  urlId: string;
  collectionId: string;
  url: string;
  normalizedUrl: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  fetchStatus: "pending" | "fetched" | "failed";
  fetchedAt: string | null;
  position: number;
  addedAt: string;
}

export interface LinkCreateInput {
  url: string;
  title?: string;
  description?: string;
  imageUrl?: string;
}

export interface LinkUpdateInput {
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
}

export interface LinkFieldErrors {
  url?: string[];
  title?: string[];
  description?: string[];
  imageUrl?: string[];
}

export interface LinkPreview {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  fetchStatus: "fetched" | "failed";
}

export function listLinks(
  collectionId: string,
  opts?: { headers?: HeadersInit }
): Promise<LinkItem[]> {
  return $fetch<LinkItem[]>(`/api/collections/${collectionId}/links`, { headers: opts?.headers });
}

export function getLink(
  collectionId: string,
  linkId: string,
  opts?: { headers?: HeadersInit }
): Promise<LinkItem> {
  return $fetch<LinkItem>(`/api/collections/${collectionId}/links/${linkId}`, {
    headers: opts?.headers
  });
}

export function createLink(collectionId: string, input: LinkCreateInput): Promise<LinkItem> {
  return $fetch<LinkItem>(`/api/collections/${collectionId}/links`, {
    method: "POST",
    body: input
  });
}

export function updateLink(
  collectionId: string,
  linkId: string,
  input: LinkUpdateInput
): Promise<LinkItem> {
  return $fetch<LinkItem>(`/api/collections/${collectionId}/links/${linkId}`, {
    method: "PATCH",
    body: input
  });
}

export async function deleteLink(collectionId: string, linkId: string): Promise<void> {
  // Widen to `string` explicitly: Nitro's typed-fetch route matching fuzzily
  // scores this URL against the closest currently-known typed route
  // (`/api/collections/:id`, get+patch only, since the links endpoints are
  // still being added server-side), which would otherwise reject "DELETE" as
  // an unavailable method for that inferred match. A plain `string` request
  // type opts out of that route-literal matching entirely.
  const endpoint: string = `/api/collections/${collectionId}/links/${linkId}`;
  await $fetch(endpoint, { method: "DELETE" });
}

export function fetchLinkPreview(url: string): Promise<LinkPreview> {
  return $fetch<LinkPreview>("/api/links/preview", { method: "POST", body: { url } });
}

function isLinkFieldErrors(value: unknown): value is LinkFieldErrors {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  const keys: (keyof LinkFieldErrors)[] = ["url", "title", "description", "imageUrl"];
  const isValidField = (field: unknown) =>
    field === undefined || (Array.isArray(field) && field.every(item => typeof item === "string"));

  // Require at least one recognized field to actually be present (and
  // non-array/non-string-array values on the others to be absent) — an empty
  // object or an object with only unrecognized keys must NOT be treated as
  // LinkFieldErrors, or callers can't distinguish "no field errors" from "not
  // this shape at all" and extractLinkFieldErrors would return a truthy `{}`
  // instead of null.
  return (
    keys.some(key => Array.isArray(candidate[key])) &&
    keys.every(key => isValidField(candidate[key]))
  );
}

/**
 * Pulls field errors out of a thrown $fetch (ofetch) error.
 * The backend throws `createError({ statusCode: 400, statusMessage: "Validation Error", data: { fieldErrors } })`,
 * which ofetch surfaces as `FetchError.data` equal to the parsed response body:
 * `{ statusCode, statusMessage, stack, data: { fieldErrors } }`.
 * Returns null if the error isn't in that shape (network failure, 401, 404, etc).
 */
export function extractLinkFieldErrors(error: unknown): LinkFieldErrors | null {
  if (typeof error !== "object" || error === null || !("data" in error)) {
    return null;
  }
  const body = (error as { data?: unknown }).data;

  if (typeof body !== "object" || body === null || !("data" in body)) {
    return null;
  }
  const payload = (body as { data?: unknown }).data;

  if (typeof payload !== "object" || payload === null || !("fieldErrors" in payload)) {
    return null;
  }
  const fieldErrors = (payload as { fieldErrors?: unknown }).fieldErrors;

  return isLinkFieldErrors(fieldErrors) ? fieldErrors : null;
}

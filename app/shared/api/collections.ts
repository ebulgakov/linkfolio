export interface Collection {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  shared: boolean;
  slug: string;
  password: string | null;
  published: boolean;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionInput {
  name: string;
  description?: string | null;
  shared: boolean;
  slug: string;
  password?: string | null;
  published: boolean;
  imageUrl?: string | null;
}

export interface FieldErrors {
  name?: string[];
  slug?: string[];
  description?: string[];
  shared?: string[];
  password?: string[];
  published?: string[];
  imageUrl?: string[];
}

export function listCollections(opts?: { headers?: HeadersInit }): Promise<Collection[]> {
  return $fetch<Collection[]>("/api/collections", { headers: opts?.headers });
}

export function getCollection(id: string, opts?: { headers?: HeadersInit }): Promise<Collection> {
  return $fetch<Collection>(`/api/collections/${id}`, { headers: opts?.headers });
}

export function createCollection(input: CollectionInput): Promise<Collection> {
  return $fetch<Collection>("/api/collections", { method: "POST", body: input });
}

export function updateCollection(id: string, input: CollectionInput): Promise<Collection> {
  return $fetch<Collection>(`/api/collections/${id}`, { method: "PATCH", body: input });
}

export async function deleteCollection(id: string): Promise<void> {
  // Widen to `string` explicitly: Nitro's typed-fetch route matching only
  // knows this route as GET/PATCH, so a literal "DELETE" method is rejected
  // by the generated types even though the server route supports it - see
  // deleteLink in links.ts for the same issue.
  const endpoint: string = `/api/collections/${id}`;
  await $fetch(endpoint, { method: "DELETE" });
}

export function checkSlugAvailability(
  slug: string,
  excludeId?: string
): Promise<{ available: boolean }> {
  return $fetch<{ available: boolean }>("/api/collections/check-slug", {
    query: excludeId ? { slug, excludeId } : { slug }
  });
}

function isFieldErrors(value: unknown): value is FieldErrors {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  const keys: (keyof FieldErrors)[] = [
    "name",
    "slug",
    "description",
    "shared",
    "password",
    "published",
    "imageUrl"
  ];
  const isValidField = (field: unknown) =>
    field === undefined || (Array.isArray(field) && field.every(item => typeof item === "string"));

  // Require at least one recognized field to actually be present (and
  // non-array/non-string-array values on the others to be absent) — an empty
  // object or an object with only unrecognized keys must NOT be treated as
  // FieldErrors, or callers can't distinguish "no field errors" from "not
  // this shape at all" and extractFieldErrors would return a truthy `{}`
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
export function extractFieldErrors(error: unknown): FieldErrors | null {
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

  return isFieldErrors(fieldErrors) ? fieldErrors : null;
}

import type { ZodError } from "zod";

// Nitro auto-imports everything under `server/utils/*`.
//
// Maps a zod `safeParse` failure into this app's Validation Error contract:
// `{ statusCode: 400, statusMessage: "Validation Error", data: { fieldErrors: { <field>: [msg, ...] } } }`.
// Every field's issues collect into an array (not a single flat message) so
// the frontend has one code path for both zod errors and Postgres 23505
// errors mapped by `throwCollectionUniqueViolation` (see
// `server/utils/collection-errors.ts`).
export function throwValidationError(error: ZodError): never {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.map(String).join(".") : "_root";
    (fieldErrors[key] ??= []).push(issue.message);
  }

  throw createError({
    statusCode: 400,
    statusMessage: "Validation Error",
    data: { fieldErrors }
  });
}

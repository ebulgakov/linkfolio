import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../../db";
import { collections } from "../../db/schema";

// A malformed (non-uuid) `:id` must not reach the driver as a raw string —
// Postgres raises `22P02 invalid input syntax for type uuid` for that, which
// would otherwise surface as an unhandled 500 instead of a clean 404.
const idSchema = z.uuid();

export default defineEventHandler(async event => {
  const userId = await requireUserId(event);
  const parsedId = idSchema.safeParse(getRouterParam(event, "id"));

  if (!parsedId.success) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }

  const id = parsedId.data;

  const [collection] = await db
    .select()
    .from(collections)
    .where(and(eq(collections.id, id), eq(collections.userId, userId)));

  if (!collection) {
    throw createError({ statusCode: 404, statusMessage: "Not Found" });
  }

  return collection;
});

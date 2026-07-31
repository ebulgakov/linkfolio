import { z } from "zod";

import { db } from "~~/server/db";
import { collections } from "~~/server/db/schema";

const collectionSchema = z.object({
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().max(2000).optional().nullable(),
  shared: z.boolean(),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    .min(3)
    .max(64)
    .refine(s => !["new", "edit"].includes(s), { message: "This slug is reserved." })
});

export default defineEventHandler(async event => {
  const userId = await requireUserId(event);

  const body = await readBody(event);
  const parsed = collectionSchema.safeParse(body);

  if (!parsed.success) {
    throwValidationError(parsed.error);
  }

  try {
    const [collection] = await db
      .insert(collections)
      .values({
        userId,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        shared: parsed.data.shared,
        slug: parsed.data.slug
      })
      .returning();

    return collection;
  } catch (error) {
    await throwCollectionUniqueViolation(error, {
      userId,
      name: parsed.data.name,
      slug: parsed.data.slug
    });
  }
});

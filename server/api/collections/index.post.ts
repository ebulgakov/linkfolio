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
    .refine(s => !["new", "edit"].includes(s), { message: "This slug is reserved." }),
  password: z.string().trim().max(255).optional().nullable(),
  published: z.boolean(),
  imageUrl: z
    .url({ protocol: /^https?$/ })
    .max(2048)
    .optional()
    .nullable()
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
        slug: parsed.data.slug,
        // Unlike `description`'s `?? null` (which only catches
        // undefined/null), `password` uses `|| null` so a trimmed empty
        // string also collapses to null - "empty = no password" must hold
        // even if a client bypasses the form's own toPayload() normalization
        // and posts "" directly.
        password: parsed.data.password || null,
        published: parsed.data.published,
        imageUrl: parsed.data.imageUrl ?? null
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

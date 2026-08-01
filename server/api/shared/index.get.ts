import { desc, eq } from "drizzle-orm";

import { db } from "~~/server/db";
import { collections } from "~~/server/db/schema";

// No requireUserId here - this route is deliberately public, mirroring
// server/api/shared/[slug].get.ts: it's the public directory listing for
// /published-collections. Gates on `published` only (not `shared OR
// published`) - a shared=true, published=false collection is reachable by
// direct link but must not be surfaced in this discovery listing. Never
// select userId/password - this response is fully public.
export default defineEventHandler(async () =>
  db
    .select({
      id: collections.id,
      name: collections.name,
      description: collections.description,
      slug: collections.slug,
      imageUrl: collections.imageUrl
    })
    .from(collections)
    .where(eq(collections.published, true))
    .orderBy(desc(collections.createdAt))
);

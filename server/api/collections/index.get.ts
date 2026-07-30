import { desc, eq } from "drizzle-orm";

import { db } from "../../db";
import { collections } from "../../db/schema";

export default defineEventHandler(async event => {
  const userId = await requireUserId(event);

  return db
    .select()
    .from(collections)
    .where(eq(collections.userId, userId))
    .orderBy(desc(collections.createdAt));
});

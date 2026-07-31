import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

import { neonAuthUsers } from "./neon-auth";

// `neonAuthUsers` is imported (not re-exported) purely so `.references()`
// below can target `neon_auth.user` for FK typing — see `neon-auth.ts` for
// why it must stay out of this file's exports.

export const collections = pgTable(
  "collections",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => neonAuthUsers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    shared: boolean("shared").notNull().default(false),
    // User-authored, not system-generated — checked for availability via an
    // AJAX endpoint before submit. Globally unique (not scoped per-user).
    // `shared` is purely a visibility gate, not a slug-regeneration trigger.
    slug: text("slug").notNull().unique(),
    // Stored as plaintext, deliberately not hashed: the owner's edit form
    // redisplays the current password as a plain (unmasked) text field,
    // which a one-way hash would make impossible. NULL means "no password
    // set" - an empty string is never stored, normalized to NULL at the
    // zod-validation boundary in the collections POST/PATCH routes. See
    // server/utils/shared-collection-password.ts for how guest access is
    // gated against this column.
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    // Set explicitly on every update in app code — no DB trigger.
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  table => [
    // Case-insensitive collection name uniqueness per user: "Recipes" and
    // "recipes" collide.
    uniqueIndex("collections_user_id_name_unique").on(
      table.userId,
      sql`lower(trim(${table.name}))`
    ),
    index("collections_user_id_idx").on(table.userId)
  ]
);

export const urls = pgTable(
  "urls",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => neonAuthUsers.id, { onDelete: "cascade" }),
    // Raw URL as submitted.
    url: text("url").notNull(),
    // Stored (not query-time) column, computed app-side before insert:
    // lowercase scheme+host, strip trailing slash, strip tracking params.
    // Must be stored or the unique constraint below catches nothing.
    normalizedUrl: text("normalized_url").notNull(),
    // Nullable — arrive async from link-preview scraping.
    title: text("title"),
    description: text("description"),
    imageUrl: text("image_url"),
    fetchStatus: text("fetch_status").notNull().default("pending"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  table => [
    // Per-user, not a global cross-tenant cache.
    uniqueIndex("urls_user_id_normalized_url_unique").on(table.userId, table.normalizedUrl),
    index("urls_user_id_idx").on(table.userId)
  ]
);

export const collectionItems = pgTable(
  "collection_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    urlId: uuid("url_id")
      .notNull()
      .references(() => urls.id, { onDelete: "cascade" }),
    // Manual ordering within the collection.
    position: integer("position").notNull(),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow()
  },
  table => [
    // No duplicate url within one collection.
    uniqueIndex("collection_items_collection_id_url_id_unique").on(table.collectionId, table.urlId),
    // Ordered listing — the hot read path.
    index("collection_items_collection_id_position_idx").on(table.collectionId, table.position),
    // Reverse lookup: which collections contain this url.
    index("collection_items_url_id_idx").on(table.urlId)
  ]
);

// Ownership invariant NOT enforced structurally: because `urls` is per-user,
// a service call could in principle add a url from user B into a collection
// owned by user A. This must be checked in the service layer (both rows'
// user_id must match) on every insert into `collection_items` — no redundant
// `user_id` column here for now (YAGNI).

import { createHash, timingSafeEqual } from "node:crypto";

import type { H3Event } from "h3";

// Nitro auto-imports everything under `server/utils/*`, so `isUnlocked` /
// `setUnlockCookie` are available in route handlers with no explicit import.

// Self-verifying cookie, no server secret: the expected token is recomputed
// server-side from the collection's *current* stored password on every
// check, rather than looked up from server-side session storage. This means
// changing or clearing the owner's password automatically invalidates every
// outstanding guest cookie for that collection (the recomputed hash no
// longer matches), with no revocation list to maintain. No HMAC key is used
// deliberately - the threat model already assumes DB access implies
// plaintext password access (see the comment on `collections.password` in
// server/db/schema.ts), so a pepper would add no real protection here.
function cookieName(collectionId: string): string {
  return `cu_${collectionId}`;
}

function unlockToken(collectionId: string, password: string): string {
  return createHash("sha256").update(`${collectionId}:${password}`).digest("hex");
}

/** `password` must be the collection's current stored (non-null) password. */
export function isUnlocked(event: H3Event, collectionId: string, password: string): boolean {
  const cookie = getCookie(event, cookieName(collectionId));
  if (!cookie) return false;

  const expected = unlockToken(collectionId, password);
  const actual = Buffer.from(cookie);
  const expectedBuffer = Buffer.from(expected);

  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}

/** `password` must be the collection's current stored (non-null) password. */
export function setUnlockCookie(event: H3Event, collectionId: string, password: string): void {
  setCookie(event, cookieName(collectionId), unlockToken(collectionId, password), {
    httpOnly: true,
    sameSite: "lax",
    // Must be "/", not scoped to /api/shared/... - otherwise the browser
    // won't send it on navigation to /shared/:slug itself, and SSR would
    // never see a previously-unlocked guest as unlocked.
    path: "/"
    // No `maxAge` - session cookie. Bounds how long an unlock persists
    // (and how many of these cookies a guest can accumulate) to one
    // browser session, since there's no server-side session store to
    // expire/cap them otherwise.
  });
}

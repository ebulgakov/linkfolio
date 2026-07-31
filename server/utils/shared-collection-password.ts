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

// Constant-time comparison for two arbitrary strings (unequal lengths short-
// circuit safely rather than throwing, unlike a bare `timingSafeEqual`).
// Shared by `isUnlocked` below (cookie vs. recomputed token) and
// server/api/shared/[slug]/unlock.post.ts (submitted vs. stored password) -
// with no attempt limiting on the unlock route, a non-constant-time `!==`
// there would let an attacker recover the password character-by-character
// via a timing side channel, which is far more practical than the brute-
// force risk the "no cap" design already accepts.
export function passwordsMatch(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  return bufferA.length === bufferB.length && timingSafeEqual(bufferA, bufferB);
}

/** `password` must be the collection's current stored (non-null) password. */
export function isUnlocked(event: H3Event, collectionId: string, password: string): boolean {
  const cookie = getCookie(event, cookieName(collectionId));
  if (!cookie) return false;

  return passwordsMatch(cookie, unlockToken(collectionId, password));
}

/** `password` must be the collection's current stored (non-null) password. */
export function setUnlockCookie(event: H3Event, collectionId: string, password: string): void {
  setCookie(event, cookieName(collectionId), unlockToken(collectionId, password), {
    httpOnly: true,
    sameSite: "lax",
    // Deployed traffic is always HTTPS (Vercel) - without this, the cookie
    // would be sent over any plain-HTTP hop too, letting the unlock be
    // captured and replayed. Modern browsers still set/send Secure cookies
    // on http://localhost during local dev (it's treated as a secure
    // context), so this doesn't need an env-based opt-out.
    secure: true,
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

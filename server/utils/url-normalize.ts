// Nitro auto-imports everything under `server/utils/*`.
//
// Single source of truth for URL normalization — used only at link-creation
// time (`server/api/collections/[id]/links/index.post.ts`), never re-applied
// on read. `urls.normalizedUrl` is what `urls_user_id_normalized_url_unique`
// is built on, so any drift between what's stored and what this function
// would produce today means the unique constraint stops catching duplicates.
//
// Fragment/default-port stripping was added after some rows were already
// stored under the old normalization - those existing `normalized_url`
// values are stale (e.g. still carry a `#fragment` or `:80`/`:443`) until
// the row is touched again, so the unique constraint won't catch a new
// duplicate against one of them until then. Acceptable pre-launch; would
// need a backfill migration otherwise.

const TRACKING_PARAM_PREFIXES = ["utm_"];
const TRACKING_PARAM_NAMES = new Set(["gclid", "fbclid", "mc_cid", "mc_eid", "igshid", "ref"]);

function isTrackingParam(key: string): boolean {
  const lower = key.toLowerCase();
  return (
    TRACKING_PARAM_PREFIXES.some(prefix => lower.startsWith(prefix)) ||
    TRACKING_PARAM_NAMES.has(lower)
  );
}

/**
 * Normalizes a URL for duplicate detection: lowercases scheme + host, drops
 * the fragment, strips the default port for the scheme (`:80` for http,
 * `:443` for https), strips a trailing slash from the path (but not a bare
 * "/"), and drops known tracking query params while preserving the order of
 * the ones that remain. Throws if `raw` isn't a parseable URL — callers must
 * validate with zod (`z.url(...)`) before calling this, since the value has
 * already passed that check by the time it reaches here.
 */
export function normalizeUrl(raw: string): string {
  const url = new URL(raw);

  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase();
  url.hash = "";
  if (
    (url.protocol === "http:" && url.port === "80") ||
    (url.protocol === "https:" && url.port === "443")
  ) {
    url.port = "";
  }

  const keptParams = new URLSearchParams();
  for (const [key, value] of url.searchParams) {
    if (!isTrackingParam(key)) {
      keptParams.append(key, value);
    }
  }
  url.search = keptParams.toString();

  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }

  return url.toString();
}

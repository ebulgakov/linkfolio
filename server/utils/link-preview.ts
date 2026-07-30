import * as cheerio from "cheerio";

// Nitro auto-imports everything under `server/utils/*`.

export interface LinkPreviewResult {
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  fetchStatus: "fetched" | "failed";
}

const FAILED_RESULT: LinkPreviewResult = {
  title: null,
  description: null,
  imageUrl: null,
  fetchStatus: "failed"
};

function normalizeText(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Fetches `url` through the SSRF-guarded `guardedFetch` (`link-fetch-guard.ts`)
 * and parses OpenGraph metadata out of the response's `<head>` with cheerio,
 * falling back to the plain `<title>`/`meta[name=description]` tags. Never
 * throws — any failure anywhere (blocked fetch, malformed HTML, missing
 * tags) resolves to the all-null `"failed"` result, matching the guard's own
 * "never throw, caller decides fetchStatus" contract.
 */
export async function fetchLinkPreview(url: string): Promise<LinkPreviewResult> {
  const fetched = await guardedFetch(url);
  if (!fetched) {
    return FAILED_RESULT;
  }

  try {
    const $ = cheerio.load(fetched.html);

    const title =
      normalizeText($('meta[property="og:title"]').attr("content")) ??
      normalizeText($("title").first().text());

    const description =
      normalizeText($('meta[property="og:description"]').attr("content")) ??
      normalizeText($('meta[name="description"]').attr("content"));

    const ogImage = $('meta[property="og:image"]').attr("content");
    let imageUrl: string | null = null;
    if (ogImage) {
      try {
        // Relative OG image paths are common (`/static/og.png`) — resolve
        // against the *final* URL after redirects, not the originally
        // requested one, or a redirecting site's relative image path
        // resolves against the wrong origin.
        imageUrl = new URL(ogImage, fetched.finalUrl).toString();
      } catch {
        imageUrl = null;
      }
    }

    return { title, description, imageUrl, fetchStatus: "fetched" };
  } catch {
    return FAILED_RESULT;
  }
}

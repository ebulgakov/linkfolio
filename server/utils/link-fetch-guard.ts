import { promises as dns } from "node:dns";
import { isIP } from "node:net";

import { Agent, fetch as undiciFetch } from "undici";

import type { LookupAddress, LookupOptions } from "node:dns";

// Nitro auto-imports everything under `server/utils/*`.
//
// This is the first place in the codebase that fetches an arbitrary,
// user-supplied external URL (link preview / OG-scraping). That makes it a
// server-side request forgery (SSRF) surface: a malicious user could submit
// `http://169.254.169.254/latest/meta-data/...` (cloud metadata),
// `http://localhost:5432/` (internal services), etc., and if we naively
// fetched it we'd let them use this server as a proxy into its own network.
//
// The defense has three parts:
//   1. Only http/https schemes are ever attempted.
//   2. DNS pinning with no TOCTOU: an `undici.Agent` is built with a custom
//      `connect.lookup` that resolves the hostname itself (via `dns.lookup`)
//      and rejects the resolution outright if the resolved address is
//      private/reserved. Critically, this is the SAME resolution used to
//      open the actual TCP socket — there is no separate "pre-check" lookup
//      that gets thrown away and re-resolved later by `fetch` (that pattern
//      is vulnerable to DNS rebinding: the check sees a public IP, the
//      hostname's TTL expires, and the real connection re-resolves to a
//      private IP). Here, the lookup function IS the connect-time resolver.
//   3. An explicit IP-literal check on every hop. `connect.lookup` above
//      only ever runs for hostnames that actually need resolving — Node's
//      `net`/`tls` connect logic calls `net.isIP(host)` first and, if the
//      host is ALREADY an IP literal (e.g. the URL is
//      `http://127.0.0.1:1234/` or a redirect's `Location` header points at
//      one), it connects directly and never calls the custom `lookup`
//      function at all. Without this check, `guardedLookup` silently
//      provides zero protection against a literal private IP in the URL or
//      a redirect target — confirmed by a real listening server on
//      `127.0.0.1`/`::1` being reachable through `guardedFetch` before this
//      check was added. So every hop explicitly checks
//      `currentUrl.hostname` with `net.isIP` and rejects it up front if it's
//      a literal that resolves into a blocked range, independent of
//      whatever `connect.lookup` would or wouldn't have caught.
//
// Contract: every exported entry point in this module (`guardedFetch`) never
// throws. Any failure — bad scheme, blocked DNS resolution, timeout, body
// too large, wrong content-type, network error, too many redirects — makes
// it resolve to `null`. Callers (currently only `link-preview.ts`) turn that
// into `fetchStatus: "failed"`.

/** Single timeout for the whole guarded fetch operation (all redirect hops plus body read combined), mirroring `GET_SESSION_TIMEOUT_MS` in `server/utils/session.ts`. A per-hop timeout would let a 3-redirect chain take up to 3x this long, which defeats the point of naming it. */
export const LINK_PREVIEW_TIMEOUT_MS = 5000;

/** Manual redirect hops followed before giving up. Each hop is re-issued as a brand new fetch through the same guarded dispatcher, so a redirect to a private IP is caught by the same DNS check as the initial request — never skipped. */
const MAX_REDIRECTS = 3;

/** Response body size cap (~1MB) — we only need `<head>`, so anything beyond this is wasted work and a potential memory-exhaustion vector. Enforced by streaming and stopping, not by reading everything then measuring. */
const MAX_BODY_BYTES = 1_000_000;

export interface GuardedFetchResult {
  html: string;
  /** The URL of the response actually used (after following redirects) — needed by `link-preview.ts` to resolve relative `og:image` paths. */
  finalUrl: string;
}

function isPrivateIPv4(address: string): boolean {
  const octets = address.split(".").map(Number);
  if (octets.length !== 4 || octets.some(o => !Number.isInteger(o) || o < 0 || o > 255)) {
    // Malformed address we don't recognize the shape of — fail closed.
    return true;
  }

  // Cast is safe: the length/range check above guarantees exactly 4 valid
  // octets, but TS's `noUncheckedIndexedAccess` doesn't narrow a `number[]`
  // that way, so plain destructuring would otherwise type `a`/`b` as
  // possibly-undefined.
  const [a, b] = octets as [number, number, number, number];
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 10) return true; // 10.0.0.0/8 RFC1918
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 RFC1918
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 RFC1918
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local + cloud metadata (169.254.169.254)
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 0) return true; // 0.0.0.0/8 "this network"
  if (a >= 224) return true; // 224.0.0.0/4 multicast + 240.0.0.0/4 reserved + broadcast

  return false;
}

/** Expands an IPv6 address string (including "::" compression and a dotted-decimal IPv4 tail like `::ffff:127.0.0.1`) into a 128-bit integer for prefix/range checks. */
function ipv6ToBigInt(address: string): bigint {
  let addr = address;

  const v4TailMatch = /(?:^|:)(\d+\.\d+\.\d+\.\d+)$/.exec(addr);
  if (v4TailMatch?.[1]) {
    const v4 = v4TailMatch[1];
    const hex = v4.split(".").map(o => Number(o).toString(16).padStart(2, "0")) as [
      string,
      string,
      string,
      string
    ];
    addr = addr.slice(0, addr.length - v4.length) + hex[0] + hex[1] + ":" + hex[2] + hex[3];
  }

  let head = addr;
  let tail = "";
  if (addr.includes("::")) {
    const parts = addr.split("::");
    head = parts[0] ?? "";
    tail = parts[1] ?? "";
  }

  const headGroups = head ? head.split(":").filter(Boolean) : [];
  const tailGroups = tail ? tail.split(":").filter(Boolean) : [];
  const missing = 8 - headGroups.length - tailGroups.length;
  const groups = [...headGroups, ...Array(Math.max(missing, 0)).fill("0"), ...tailGroups].slice(
    0,
    8
  );

  let value = 0n;
  for (const group of groups) {
    value = (value << 16n) | BigInt(parseInt(group || "0", 16));
  }
  return value;
}

function isPrivateIPv6(address: string): boolean {
  try {
    const value = ipv6ToBigInt(address);
    const prefix = (bits: number) => value >> BigInt(128 - bits);

    if (value === 0n) return true; // :: unspecified
    if (value === 1n) return true; // ::1 loopback
    if (prefix(10) === 0b1111111010n) return true; // fe80::/10 link-local
    if (prefix(7) === 0b1111110n) return true; // fc00::/7 unique local (ULA)
    if (prefix(8) === 0b11111111n) return true; // ff00::/8 multicast

    // IPv4-mapped (::ffff:a.b.c.d) and deprecated IPv4-compatible (::a.b.c.d)
    // addresses decode to an embedded IPv4 address that must be checked too
    // — otherwise `::ffff:169.254.169.254` would sail through as "not an
    // IPv4 literal" even though it resolves to the same metadata endpoint.
    if (prefix(96) === 0xffffn || prefix(96) === 0n) {
      const v4 = value & 0xffffffffn;
      const octets = [
        Number((v4 >> 24n) & 0xffn),
        Number((v4 >> 16n) & 0xffn),
        Number((v4 >> 8n) & 0xffn),
        Number(v4 & 0xffn)
      ];
      return isPrivateIPv4(octets.join("."));
    }

    return false;
  } catch {
    return true; // Anything we failed to parse — fail closed.
  }
}

function isBlockedAddress(address: string, family: number): boolean {
  return family === 6 ? isPrivateIPv6(address) : isPrivateIPv4(address);
}

/**
 * Custom `connect.lookup` for the guarded `undici.Agent`. Node's `net`/`tls`
 * connect logic calls this with `options.all: true` whenever Happy Eyeballs
 * (`autoSelectFamily`, default since Node 20) is active, in which case the
 * callback must receive an array of `{ address, family }` rather than a
 * single `(err, address, family)` triple — verified empirically against this
 * Node/undici version before writing this (autoSelectFamily is on by
 * default, so the array form is the one that actually runs in practice).
 * Handles both shapes so this doesn't silently break if that default changes
 * upstream. Every resolved address is filtered, not just the first — a
 * hostname with both a public and a private A/AAAA record must not let the
 * private one slip through in the array's tail.
 */
function guardedLookup(
  hostname: string,
  options: LookupOptions,
  callback: (
    err: NodeJS.ErrnoException | null,
    address: string | LookupAddress[],
    family?: number
  ) => void
): void {
  dns
    .lookup(hostname, { family: options.family, hints: options.hints, verbatim: true, all: true })
    .then(results => {
      const safe = results.filter(r => !isBlockedAddress(r.address, r.family));

      if (safe.length === 0) {
        callback(new Error(`link-fetch-guard: blocked resolution for host "${hostname}"`), []);
        return;
      }

      if (options.all) {
        callback(null, safe);
        return;
      }

      const first = safe[0];
      if (!first) {
        callback(new Error(`link-fetch-guard: blocked resolution for host "${hostname}"`), []);
        return;
      }
      callback(null, first.address, first.family);
    })
    .catch((err: NodeJS.ErrnoException) => callback(err, []));
}

function createGuardedAgent(): Agent {
  return new Agent({ connect: { lookup: guardedLookup } });
}

async function readBodyCapped(response: Response, maxBytes: number): Promise<string | null> {
  const body = response.body;
  if (!body) return "";

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > maxBytes) {
          await reader.cancel().catch(() => undefined);
          return null;
        }
        chunks.push(value);
      }
    }
  } catch {
    return null;
  }

  return Buffer.concat(chunks.map(c => Buffer.from(c))).toString("utf-8");
}

async function guardedFetchInner(initialUrl: string): Promise<GuardedFetchResult | null> {
  let currentUrl: URL;
  try {
    currentUrl = new URL(initialUrl);
  } catch {
    return null;
  }

  const agent = createGuardedAgent();
  const controller = new AbortController();
  // One timer for the entire operation (all hops + body read), not one per
  // hop — a per-hop timeout would let a 3-redirect chain take 3x as long as
  // the named constant promises.
  const timer = setTimeout(() => controller.abort(), LINK_PREVIEW_TIMEOUT_MS);

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (currentUrl.protocol !== "http:" && currentUrl.protocol !== "https:") {
        return null;
      }

      // `URL.hostname` keeps the `[...]` brackets an IPv6 literal wears in a
      // URL (e.g. "[::1]") — `net.isIP` does NOT recognize the bracketed
      // form as a literal (`isIP("[::1]")` is 0, `isIP("::1")` is 6), so the
      // brackets must be stripped before checking, or this whole branch
      // silently no-ops for every IPv6 literal. `net.isIP` returns 0 for
      // anything that isn't a literal IPv4/IPv6 address (i.e. an actual
      // hostname needing DNS resolution, which `guardedLookup` handles
      // instead) and 4 or 6 otherwise. Checked on every hop, not just the
      // initial URL, since a redirect's `Location` can just as easily be a
      // literal private IP.
      const bareHostname = currentUrl.hostname.replace(/^\[|\]$/g, "");
      const literalFamily = isIP(bareHostname);
      if (literalFamily !== 0 && isBlockedAddress(bareHostname, literalFamily)) {
        return null;
      }

      let response: Response;
      try {
        response = (await undiciFetch(currentUrl, {
          redirect: "manual",
          dispatcher: agent,
          signal: controller.signal,
          headers: { accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1" }
        })) as unknown as Response;
      } catch {
        return null;
      }

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        await response.body?.cancel().catch(() => undefined);

        if (!location || hop === MAX_REDIRECTS) {
          return null;
        }

        try {
          currentUrl = new URL(location, currentUrl);
        } catch {
          return null;
        }
        continue;
      }

      if (!response.ok) {
        await response.body?.cancel().catch(() => undefined);
        return null;
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!/^text\/html/i.test(contentType.trim())) {
        await response.body?.cancel().catch(() => undefined);
        return null;
      }

      const html = await readBodyCapped(response, MAX_BODY_BYTES);
      if (html === null) {
        return null;
      }

      return { html, finalUrl: currentUrl.toString() };
    }

    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    await agent.close().catch(() => undefined);
  }
}

/**
 * Fetches `url` through the SSRF guard described above. Never throws — any
 * failure at any stage resolves to `null`, which callers must translate into
 * `fetchStatus: "failed"` rather than propagating an HTTP error, since a
 * failed preview fetch is a valid outcome, not a server error.
 */
export async function guardedFetch(url: string): Promise<GuardedFetchResult | null> {
  try {
    return await guardedFetchInner(url);
  } catch {
    return null;
  }
}

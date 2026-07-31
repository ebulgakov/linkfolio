import { beforeEach, describe, expect, it, vi } from "vitest";

import { guardedFetch } from "~~/server/utils/link-fetch-guard";

// `guardedFetchInner` imports `fetch`/`Agent` directly from `undici` (not
// through the global dispatcher), so that's the only boundary that can
// actually intercept the outbound request in a test - `undici.MockAgent` /
// `setGlobalDispatcher` would silently do nothing here. `vi.mock` factories
// are hoisted above all imports by Vitest's transform regardless of where
// they appear in the source, so writing this below the import above (rather
// than needing an `eslint-disable` for import ordering) is safe.
const fetchMock = vi.hoisted(() => vi.fn());
const agentCloseMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock("undici", () => ({
  fetch: fetchMock,
  // `guardedFetchInner`'s `finally` always calls `agent.close()`, so the
  // stub must provide one. Must be a real `function` (not an arrow) since
  // the code under test invokes this with `new`.
  Agent: vi.fn(function MockAgent(this: { close: typeof agentCloseMock }) {
    this.close = agentCloseMock;
  })
}));

function makeHtmlResponse(): unknown {
  return {
    status: 200,
    ok: true,
    headers: {
      get: (name: string) => (name.toLowerCase() === "content-type" ? "text/html" : null)
    },
    body: null
  };
}

describe("guardedFetch", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    agentCloseMock.mockReset().mockResolvedValue(undefined);
  });

  it.each([
    ["loopback IPv4", "http://127.0.0.1/"],
    ["loopback IPv6", "http://[::1]/"],
    ["cloud metadata address", "http://169.254.169.254/"],
    ["IPv4-mapped IPv6 loopback", "http://[::ffff:127.0.0.1]/"],
    ["non-http(s) scheme", "ftp://example.com/"],
    ["malformed URL", "not-a-url"]
  ])("blocks %s before ever attempting a network request", async (_label, url) => {
    const result = await guardedFetch(url);

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends a non-empty User-Agent header on the outbound request", async () => {
    fetchMock.mockResolvedValue(makeHtmlResponse());

    await guardedFetch("https://example.com/");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, options] = fetchMock.mock.calls[0] as [unknown, { headers: Record<string, string> }];
    expect(options.headers["user-agent"]).toBeTruthy();
  });
});

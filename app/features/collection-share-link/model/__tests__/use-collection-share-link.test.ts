import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useCollectionShareLink } from "../use-collection-share-link";

// Mirrors stubClipboardReadApi in app/shared/lib/__tests__/use-image-upload.test.ts,
// but for the write side: useClipboard() (real, not mocked) calls
// navigator.clipboard.writeText directly.
function stubClipboardWriteApi(writeText: ((text: string) => Promise<void>) | undefined) {
  Object.defineProperty(navigator, "clipboard", {
    value: writeText ? { writeText } : undefined,
    configurable: true
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  stubClipboardWriteApi(undefined);
  vi.useRealTimers();
});

describe("useCollectionShareLink", () => {
  it("builds shareUrl from the current origin and the given slug", () => {
    const { shareUrl } = useCollectionShareLink("my-collection");

    expect(shareUrl.value).toBe("http://localhost:3000/shared/my-collection");
  });

  it("onCopyClick sets copied to true once navigator.clipboard.writeText resolves", async () => {
    stubClipboardWriteApi(vi.fn().mockResolvedValue(undefined));
    const { copied, copyFailed, onCopyClick } = useCollectionShareLink("my-collection");

    await onCopyClick();

    expect(copied.value).toBe(true);
    expect(copyFailed.value).toBe(false);
  });

  it("onCopyClick sets copyFailed to true when writeText rejects, resetting to false after 3000ms", async () => {
    stubClipboardWriteApi(vi.fn().mockRejectedValue(new Error("denied")));
    const { copied, copyFailed, onCopyClick } = useCollectionShareLink("my-collection");

    await onCopyClick();

    expect(copyFailed.value).toBe(true);
    expect(copied.value).toBe(false);

    vi.advanceTimersByTime(3000);

    expect(copyFailed.value).toBe(false);
  });
});

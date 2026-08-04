import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, effectScope, type PropType } from "vue";

import { deferred } from "~/shared/testing/deferred";
import { tMock } from "~/shared/testing/mocks/i18n";
import {
  deleteUploadedImageMock,
  resetUploadsApiMocks,
  uploadImageMock
} from "~/shared/testing/mocks/uploads-api";

// This import must stay last: the `~/shared/testing/mocks/*` modules above
// register their `vi.mock`/`mockNuxtImport` side effects as they're
// evaluated, in the order their import statements appear. Importing the
// composable under test first would resolve its own `~/shared/api/uploads`/
// `useI18n` auto-imports against the real implementations before the mocks
// are registered, so `pnpm lint:fix`/editors must not reorder this.
// eslint-disable-next-line import/order
import { useImageUpload } from "../use-image-upload";

// useImageUpload() calls onScopeDispose() (to unregister its document paste
// listener on teardown), which warns if invoked with no active Vue effect
// scope - exactly what happens calling a composable directly from a plain
// test function. An effectScope() satisfies that with no need for a full
// component mount, matching the convention in
// use-collection-form.test.ts/use-link-form.test.ts (the only other
// composables in this repo using onScopeDispose).
//
// useImageUpload() also unconditionally calls onMounted() (to feature-detect
// navigator.clipboard.read and register the document paste listener - see
// the dedicated mount-based describe blocks below for coverage of that
// path). Vue logs a "no active component instance" warning when onMounted
// runs with no active component, which is expected and harmless for these
// business-logic-only tests: the callback is simply never invoked, and none
// of these tests depend on it running. Silenced here to keep output clean.
function withEffectScope<T>(setup: () => T): T {
  const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  try {
    return effectScope().run(setup)!;
  } finally {
    warnSpy.mockRestore();
  }
}

type ModelValueProps = { modelValue: string | null };

function makeFile(name: string, type: string, sizeBytes = 10): File {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

// onMounted-gated behavior (feature-detecting the clipboard read API,
// registering the document `paste` listener) genuinely needs a live
// component instance - onMounted is a no-op with no active component,
// unlike onScopeDispose above which only needs an effect scope. This is the
// first composable in the repo needing this; per @vue/test-utils' own
// "Testing composables" guidance (reusability-composition.md), the minimal
// fix is a headless host component whose setup() spreads the composable's
// return value onto the instance so `wrapper.vm` can read/call it.
function mountImageUpload(initialProps: ModelValueProps) {
  const emit = vi.fn();
  const TestComponent = defineComponent({
    props: {
      modelValue: { type: String as unknown as PropType<string | null>, default: null }
    },
    setup(props) {
      return useImageUpload(props, emit as never);
    },
    render: () => null
  });

  const wrapper = mount(TestComponent, { props: initialProps });
  return { wrapper, emit };
}

function stubClipboardReadApi(read: (() => Promise<unknown>) | undefined) {
  Object.defineProperty(navigator, "clipboard", {
    value: read ? { read } : undefined,
    configurable: true
  });
}

beforeEach(() => {
  resetUploadsApiMocks();
  // Real deleteUploadedImage() resolves void; both remove() and the replace
  // path call `.catch()` on its return value fire-and-forget, so the mock
  // needs a default resolved promise (not just `vi.fn()`'s `undefined`) or
  // that `.catch()` throws.
  deleteUploadedImageMock.mockResolvedValue(undefined);
  tMock.mockClear();
  stubClipboardReadApi(undefined);
});

afterEach(() => {
  stubClipboardReadApi(undefined);
});

describe("useImageUpload - uploadFile via onFileSelected", () => {
  it("on success, writes the new url via emit and tracks it for later removal - but never tracks the original prop value", async () => {
    const props: ModelValueProps = {
      modelValue: "https://blob.example/uploads/other-user/original.png"
    };
    const emit = vi.fn();
    uploadImageMock.mockResolvedValue({ url: "https://blob.example/uploads/user-1/new.png" });

    const { onFileSelected, remove } = withEffectScope(() => useImageUpload(props, emit));

    onFileSelected(makeFile("photo.png", "image/png"));
    await flushPromises();

    expect(emit).toHaveBeenCalledWith(
      "update:modelValue",
      "https://blob.example/uploads/user-1/new.png"
    );

    // remove() on the value THIS composable uploaded this session does delete it.
    props.modelValue = "https://blob.example/uploads/user-1/new.png";
    remove();
    expect(deleteUploadedImageMock).toHaveBeenCalledWith(
      "https://blob.example/uploads/user-1/new.png"
    );
  });

  it("remove() on the original prop value the composable was constructed with never deletes it", () => {
    const props: ModelValueProps = {
      modelValue: "https://blob.example/uploads/other-user/original.png"
    };
    const emit = vi.fn();

    const { remove } = withEffectScope(() => useImageUpload(props, emit));
    remove();

    expect(emit).toHaveBeenCalledWith("update:modelValue", null);
    expect(deleteUploadedImageMock).not.toHaveBeenCalled();
  });

  it("rejects an oversized file before ever calling uploadImage, setting the tooLarge message", async () => {
    const props: ModelValueProps = { modelValue: null };
    const emit = vi.fn();
    const { onFileSelected, error } = withEffectScope(() => useImageUpload(props, emit));

    onFileSelected(makeFile("big.png", "image/png", 2 * 1024 * 1024 + 1));
    await flushPromises();

    expect(uploadImageMock).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
    expect(error.value).toBe("Image must be 2MB or smaller.");
  });

  it("rejects a disallowed mime type before ever calling uploadImage, setting the invalidType message", async () => {
    const props: ModelValueProps = { modelValue: null };
    const emit = vi.fn();
    const { onFileSelected, error } = withEffectScope(() => useImageUpload(props, emit));

    onFileSelected(makeFile("evil.svg", "image/svg+xml"));
    await flushPromises();

    expect(uploadImageMock).not.toHaveBeenCalled();
    expect(error.value).toBe("Please choose a PNG, JPEG, GIF, or WEBP image.");
  });

  it("sets pending true while the upload is in flight and false once it settles", async () => {
    const props: ModelValueProps = { modelValue: null };
    const emit = vi.fn();
    const { onFileSelected, pending } = withEffectScope(() => useImageUpload(props, emit));

    const { promise, resolve } = deferred<{ url: string }>();
    uploadImageMock.mockReturnValue(promise);

    expect(pending.value).toBe(false);
    onFileSelected(makeFile("photo.png", "image/png"));
    await Promise.resolve();
    expect(pending.value).toBe(true);

    resolve({ url: "https://blob.example/uploads/user-1/new.png" });
    await flushPromises();
    expect(pending.value).toBe(false);
  });

  it("sets the uploadFailed message (not the raw error) and clears pending when uploadImage rejects", async () => {
    const props: ModelValueProps = { modelValue: null };
    const emit = vi.fn();
    const { onFileSelected, error, pending } = withEffectScope(() => useImageUpload(props, emit));

    uploadImageMock.mockRejectedValue(new Error("network down"));
    onFileSelected(makeFile("photo.png", "image/png"));
    await flushPromises();

    expect(error.value).toBe("Couldn't upload the image. Please try again.");
    expect(pending.value).toBe(false);
    expect(emit).not.toHaveBeenCalled();
  });

  describe("replace path", () => {
    it("deletes the old session-uploaded value only after the new upload succeeds, never before", async () => {
      const props: ModelValueProps = { modelValue: null };
      const emit = vi.fn();
      const { onFileSelected } = withEffectScope(() => useImageUpload(props, emit));

      uploadImageMock.mockResolvedValueOnce({ url: "https://blob.example/uploads/user-1/old.png" });
      onFileSelected(makeFile("old.png", "image/png"));
      await flushPromises();
      // Simulate the parent re-rendering with the new v-model value - props
      // is a plain object read synchronously inside uploadFile, not a
      // watched Vue reactive proxy (see the composable's own "must be passed
      // through as the component's actual reactive props object" comment;
      // for this direct, no-mount test a plain mutable object stands in for
      // that live prop).
      props.modelValue = "https://blob.example/uploads/user-1/old.png";

      const { promise, resolve } = deferred<{ url: string }>();
      uploadImageMock.mockReturnValueOnce(promise);

      onFileSelected(makeFile("new.png", "image/png"));
      await Promise.resolve();
      expect(deleteUploadedImageMock).not.toHaveBeenCalled();

      resolve({ url: "https://blob.example/uploads/user-1/new.png" });
      await flushPromises();

      expect(deleteUploadedImageMock).toHaveBeenCalledWith(
        "https://blob.example/uploads/user-1/old.png"
      );
      expect(emit).toHaveBeenLastCalledWith(
        "update:modelValue",
        "https://blob.example/uploads/user-1/new.png"
      );
    });

    it("does not delete the old value if the new upload fails", async () => {
      const props: ModelValueProps = { modelValue: null };
      const emit = vi.fn();
      const { onFileSelected } = withEffectScope(() => useImageUpload(props, emit));

      uploadImageMock.mockResolvedValueOnce({ url: "https://blob.example/uploads/user-1/old.png" });
      onFileSelected(makeFile("old.png", "image/png"));
      await flushPromises();
      props.modelValue = "https://blob.example/uploads/user-1/old.png";

      uploadImageMock.mockRejectedValueOnce(new Error("network down"));
      onFileSelected(makeFile("new.png", "image/png"));
      await flushPromises();

      expect(deleteUploadedImageMock).not.toHaveBeenCalled();
      expect(emit).toHaveBeenLastCalledWith(
        "update:modelValue",
        "https://blob.example/uploads/user-1/old.png"
      );
    });
  });
});

describe("useImageUpload - document paste listener (needs a mounted component: onMounted registers it)", () => {
  it("a paste event carrying an image/* file triggers an upload", async () => {
    uploadImageMock.mockResolvedValue({ url: "https://blob.example/uploads/user-1/pasted.png" });
    const { wrapper, emit } = mountImageUpload({ modelValue: null });

    const file = makeFile("clip.png", "image/png");
    const event = new Event("paste", { cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: { files: [file] } });
    document.dispatchEvent(event);
    await flushPromises();

    expect(uploadImageMock).toHaveBeenCalledWith(file);
    expect(emit).toHaveBeenCalledWith(
      "update:modelValue",
      "https://blob.example/uploads/user-1/pasted.png"
    );

    wrapper.unmount();
  });

  it("a paste event with no image/* file is left alone (no upload attempted)", async () => {
    const { wrapper } = mountImageUpload({ modelValue: null });

    const textFile = new File(["hello"], "note.txt", { type: "text/plain" });
    const event = new Event("paste", { cancelable: true });
    Object.defineProperty(event, "clipboardData", { value: { files: [textFile] } });
    document.dispatchEvent(event);
    await flushPromises();

    expect(uploadImageMock).not.toHaveBeenCalled();

    wrapper.unmount();
  });
});

describe("useImageUpload - pasteFromClipboard()", () => {
  it("is a no-op when navigator.clipboard.read is unsupported (canUseClipboardReadApi stays false)", async () => {
    stubClipboardReadApi(undefined);
    const { wrapper } = mountImageUpload({ modelValue: null });
    await flushPromises();

    expect(wrapper.vm.canUseClipboardReadApi).toBe(false);

    await wrapper.vm.pasteFromClipboard();

    expect(uploadImageMock).not.toHaveBeenCalled();
    expect(wrapper.vm.error).toBeNull();

    wrapper.unmount();
  });

  it("sets the clipboardDenied message when navigator.clipboard.read() throws NotAllowedError", async () => {
    stubClipboardReadApi(() => Promise.reject(new DOMException("denied", "NotAllowedError")));
    const { wrapper } = mountImageUpload({ modelValue: null });
    await flushPromises();
    expect(wrapper.vm.canUseClipboardReadApi).toBe(true);

    await wrapper.vm.pasteFromClipboard();

    expect(wrapper.vm.error).toBe(
      "Clipboard permission denied. Allow clipboard access, or choose a file instead."
    );
    expect(uploadImageMock).not.toHaveBeenCalled();

    wrapper.unmount();
  });

  it("sets the clipboardEmpty message when the clipboard resolves with no image/* item", async () => {
    stubClipboardReadApi(() => Promise.resolve([{ types: ["text/plain"], getType: vi.fn() }]));
    const { wrapper } = mountImageUpload({ modelValue: null });
    await flushPromises();

    await wrapper.vm.pasteFromClipboard();

    expect(wrapper.vm.error).toBe("No image found on the clipboard.");
    expect(uploadImageMock).not.toHaveBeenCalled();

    wrapper.unmount();
  });
});

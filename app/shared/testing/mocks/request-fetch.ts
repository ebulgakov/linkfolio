import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { vi } from "vitest";

const requestFetchMock = vi.hoisted(() => vi.fn());

export { requestFetchMock };

mockNuxtImport("useRequestFetch", () => () => requestFetchMock);

export function resetRequestFetchMock() {
  requestFetchMock.mockReset();
}

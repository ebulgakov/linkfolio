import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { vi } from "vitest";

const refreshNuxtDataMock = vi.hoisted(() => vi.fn());

export { refreshNuxtDataMock };

mockNuxtImport("refreshNuxtData", () => refreshNuxtDataMock);

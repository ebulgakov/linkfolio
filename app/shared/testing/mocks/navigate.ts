import { mockNuxtImport } from "@nuxt/test-utils/runtime";
import { vi } from "vitest";

const navigateToMock = vi.hoisted(() => vi.fn());

export { navigateToMock };

mockNuxtImport("navigateTo", () => navigateToMock);

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// `cacheLife`/`cacheTag` throw outside a Next cache scope, and `"use cache"` is an inert string
// under Vitest, so every test gets no-op cache calls; a file-level `vi.mock` still overrides this.
vi.mock("next/cache", () => ({
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  revalidateTag: vi.fn(),
}));

afterEach(() => {
  cleanup();
});

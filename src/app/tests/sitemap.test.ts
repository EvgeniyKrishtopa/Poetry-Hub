// @vitest-environment node
import { connection } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getSitemapEntries } from "@/features/seo";

import sitemap from "../sitemap";

vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("@/features/seo", () => ({ getSitemapEntries: vi.fn() }));

const ENTRIES = [{ url: "https://example.org/" }];

describe("sitemap route", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  // implements FR-9 of seo-metadata
  it("returns the feature's entries after waiting for a request", async () => {
    vi.mocked(getSitemapEntries).mockResolvedValue(ENTRIES);

    await expect(sitemap()).resolves.toEqual(ENTRIES);
    expect(vi.mocked(connection).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(getSitemapEntries).mock.invocationCallOrder[0],
    );
  });

  // implements FR-9, NFR-5 of seo-metadata
  it("rejects when the entries can't be read, so the route answers 5xx", async () => {
    vi.mocked(getSitemapEntries).mockRejectedValue(new Error("Sitemap source unavailable"));

    await expect(sitemap()).rejects.toThrow("Sitemap source unavailable");
  });
});

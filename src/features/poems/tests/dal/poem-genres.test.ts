// @vitest-environment node
import { cacheLife, cacheTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CONTENTFUL_CACHE_TAG, ContentfulError, contentfulQuery } from "@/shared/lib/contentful";

import { getPoemGenreName, listPoemGenres } from "../../dal/poem-genres";

vi.mock("@/shared/lib/contentful", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/lib/contentful")>()),
  contentfulQuery: vi.fn(),
}));

const queryMock = vi.mocked(contentfulQuery);

function tag(id: string, name: string, slug = id) {
  return { sys: { id }, name, slug };
}

function collection(items: unknown[], total = items.length) {
  return { tagCollection: { total, items } };
}

const ELEGY = tag("elegy", "Элегия");
const LYRIC = tag("lyric", "Лирика");
const BALLAD = tag("ballad", "Баллада");
const SONNET = tag("sonnet", "Сонет");

describe("poem genres DAL", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("listPoemGenres", () => {
    // implements FR-3 of add-poem-creation
    it("returns the genres sorted by Russian name, tagged for the publish webhook and kept for hours", async () => {
      queryMock.mockResolvedValue(collection([SONNET, ELEGY, LYRIC, BALLAD]));

      await expect(listPoemGenres()).resolves.toEqual({
        ok: true,
        genres: [
          { id: "ballad", name: "Баллада" },
          { id: "lyric", name: "Лирика" },
          { id: "sonnet", name: "Сонет" },
          { id: "elegy", name: "Элегия" },
        ],
      });
      expect(queryMock).toHaveBeenCalledExactlyOnceWith(expect.stringContaining("tagCollection"), { limit: 100 });
      expect(cacheTag).toHaveBeenCalledExactlyOnceWith(CONTENTFUL_CACHE_TAG);
      expect(cacheLife).toHaveBeenCalledExactlyOnceWith("hours");
    });

    // implements NFR-10 of add-poem-creation
    it("drops an invalid entry and logs only its id, keeping the rest", async () => {
      queryMock.mockResolvedValue(collection([LYRIC, tag("broken", " ", "broken"), { name: "Без id" }]));

      await expect(listPoemGenres()).resolves.toEqual({ ok: true, genres: [{ id: "lyric", name: "Лирика" }] });
      expect(console.error).toHaveBeenNthCalledWith(1, "[poems] genre entry dropped: invalid", { id: "broken" });
      expect(console.error).toHaveBeenNthCalledWith(2, "[poems] genre entry dropped: invalid", {});
    });

    it("warns with both counts when there are more tags than one page holds", async () => {
      queryMock.mockResolvedValue(collection([LYRIC], 120));

      await expect(listPoemGenres()).resolves.toMatchObject({ ok: true });
      expect(console.warn).toHaveBeenCalledExactlyOnceWith("[poems] more genres than read", { total: 120, limit: 100 });
    });

    // implements FR-3 of add-poem-creation
    it("returns unavailable, kept for seconds, when Contentful fails", async () => {
      queryMock.mockRejectedValue(new ContentfulError("network", "Contentful request failed or timed out"));

      await expect(listPoemGenres()).resolves.toEqual({ ok: false, reason: "unavailable" });
      expect(cacheLife).toHaveBeenCalledExactlyOnceWith("seconds");
      expect(console.error).toHaveBeenCalledExactlyOnceWith("[poems] list genres failed: network");
    });

    it("returns unavailable, kept for seconds, on a response of the wrong shape", async () => {
      queryMock.mockResolvedValue({ tagCollection: null });

      await expect(listPoemGenres()).resolves.toEqual({ ok: false, reason: "unavailable" });
      expect(cacheLife).toHaveBeenCalledExactlyOnceWith("seconds");
      expect(console.error).toHaveBeenCalledExactlyOnceWith("[poems] list genres failed: validation");
    });

    it("rethrows an error that isn't a Contentful failure", async () => {
      queryMock.mockRejectedValue(new RangeError("bug"));

      await expect(listPoemGenres()).rejects.toThrow("bug");
    });
  });

  describe("getPoemGenreName", () => {
    // implements FR-10 of add-poem-creation
    it("is none for a poem with no genre, with no Contentful read", async () => {
      await expect(getPoemGenreName(null)).resolves.toEqual({ kind: "none" });
      expect(queryMock).not.toHaveBeenCalled();
    });

    // implements FR-10 of add-poem-creation
    it("names a known genre from the current list, so a rename shows", async () => {
      queryMock.mockResolvedValue(collection([tag("lyric", "Лирическое")]));

      await expect(getPoemGenreName("lyric")).resolves.toEqual({ kind: "named", name: "Лирическое" });
    });

    // implements FR-10 of add-poem-creation
    it("is none for an id Contentful no longer lists", async () => {
      queryMock.mockResolvedValue(collection([LYRIC]));

      await expect(getPoemGenreName("deleted-tag")).resolves.toEqual({ kind: "none" });
    });

    // implements FR-10 of add-poem-creation
    it("is none when the list is unavailable", async () => {
      queryMock.mockRejectedValue(new ContentfulError("http", "Contentful responded with HTTP 500", { status: 500 }));

      await expect(getPoemGenreName("lyric")).resolves.toEqual({ kind: "none" });
    });
  });
});

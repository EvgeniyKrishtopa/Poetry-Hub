// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getAuthorPoem, listAuthorPoems } from "../../dal/author-poems";
import { mockPoemCount } from "../../dal/mock-poem-count";
import { MOCK_POEMS } from "../../dal/mock-poems";

// A spy over the real count rule, so a test can see how many lookups a read made.
vi.mock("../../dal/mock-poem-count", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../dal/mock-poem-count")>();
  return { mockPoemCount: vi.fn(original.mockPoemCount) };
});

// Vitest runs the client React build, whose `cache` doesn't memoize. Stand in a memo whose stores
// are cleared before each test, so one test is one request.
const memoStores = vi.hoisted(() => [] as Map<string, unknown>[]);
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  cache: <A extends unknown[], R>(fn: (...args: A) => R) => {
    const store = new Map<string, R>();
    memoStores.push(store as Map<string, unknown>);
    return (...args: A): R => {
      const key = JSON.stringify(args);
      if (!store.has(key)) store.set(key, fn(...args));
      return store.get(key) as R;
    };
  },
}));

/** Gets all four mock poems (see mock-poem-count.test.ts for how the counts fall). */
const FOUR_POEMS_ID = "00000000-0000-4000-8000-000000000001";
/** Gets the first two mock poems: the garden one (2026-03-12) and the station one (2026-07-01). */
const TWO_POEMS_ID = "00000000-0000-4000-8000-000000000004";
const NO_POEMS_ID = "00000000-0000-4000-8000-000000000002";

const [GARDEN, STATION, BRIDGE] = MOCK_POEMS;

describe("author poems DAL", () => {
  beforeEach(() => {
    for (const store of memoStores) store.clear();
    vi.mocked(mockPoemCount).mockClear();
  });

  describe("listAuthorPoems", () => {
    // implements FR-7 of add-author-poems
    it("returns the first N mock poems, newest first", async () => {
      const poems = await listAuthorPoems(TWO_POEMS_ID);

      expect(poems.map(({ id }) => id)).toEqual([STATION.id, GARDEN.id]);
    });

    // implements FR-7 of add-author-poems
    it("returns the same poems in the same order on every read", async () => {
      expect(await listAuthorPoems(FOUR_POEMS_ID)).toEqual(await listAuthorPoems(FOUR_POEMS_ID));
      expect(await listAuthorPoems(FOUR_POEMS_ID)).toHaveLength(MOCK_POEMS.length);
    });

    it("returns no poems for an author whose count is 0", async () => {
      expect(await listAuthorPoems(NO_POEMS_ID)).toEqual([]);
    });

    it("leaves the mock set's own order untouched", async () => {
      await listAuthorPoems(FOUR_POEMS_ID);

      expect(MOCK_POEMS[0]).toBe(GARDEN);
    });
  });

  describe("getAuthorPoem", () => {
    // implements FR-5 of add-author-poems
    it("returns one of the author's poems by its id", async () => {
      expect(await getAuthorPoem(TWO_POEMS_ID, GARDEN.id)).toEqual({ ok: true, poem: GARDEN });
    });

    // implements FR-5, FR-7 of add-author-poems
    it.each([
      ["a poem past the author's count", BRIDGE.id],
      ["an unknown id", "no-such-poem"],
      ["the uppercase spelling of the author's own poem id", GARDEN.id.toUpperCase()],
    ])("returns not-found for %s", async (_case, poemId) => {
      expect(await getAuthorPoem(TWO_POEMS_ID, poemId)).toEqual({ ok: false, reason: "not-found" });
    });

    // implements FR-12 of add-author-poems
    it("reads once per request for the same author and poem", async () => {
      const first = getAuthorPoem(TWO_POEMS_ID, GARDEN.id);
      const second = getAuthorPoem(TWO_POEMS_ID, GARDEN.id);

      expect(second).toBe(first);
      await first;
      expect(mockPoemCount).toHaveBeenCalledTimes(1);
    });
  });
});

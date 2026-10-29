// @vitest-environment node
import { cacheLife, cacheTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { createSupabasePublicClient } from "@/shared/lib/supabase/public";

import { getAuthorPoem, listAuthorPoems } from "../../dal/author-poems";
import { POEM_COLUMNS } from "../../model/poem.constants";

import { createFakePublicClient, errorResponse, ILLUSTRATIONS_URL_BASE, okResponse, type FakePublicClient } from "./fake-public-client";

vi.mock("@/shared/lib/supabase/public", () => ({ createSupabasePublicClient: vi.fn() }));

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

const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const STATION_ID = "30000000-0000-4000-8000-000000000052";
/** Has hex letters, so its uppercase spelling differs. */
const GARDEN_ID = "c3a1b2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const OTHER_AUTHORS_POEM_ID = "30000000-0000-4000-8000-000000000031";
const ILLUSTRATION_PATH = `${AUTHOR_ID}/0b7c1d2e-3f40-4a5b-8c6d-7e8f9a0b1c2d.jpg`;

const SECRET_TITLE = "Секрет";
const SECRET_TEXT = "тайна";

/** The rows as PostgREST returns them: already newest first. */
const STATION_ROW = {
  id: STATION_ID,
  title: "Ночной вокзал",
  text: "Табло мигает",
  genre_id: "lyric",
  illustration_path: ILLUSTRATION_PATH,
  created_at: "2026-10-02T08:00:00.123456+00:00",
};
const GARDEN_ROW = {
  id: GARDEN_ID,
  title: "Осенний сад",
  text: "Листва ложится",
  genre_id: null,
  illustration_path: null,
  created_at: "2026-10-01T23:30:00+00:00",
};

let supabase: FakePublicClient;

function clearMemo(): void {
  for (const store of memoStores) store.clear();
}

describe("author poems DAL", () => {
  beforeEach(() => {
    clearMemo();
    supabase = createFakePublicClient();
    vi.mocked(createSupabasePublicClient).mockReturnValue(supabase.client);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("listAuthorPoems", () => {
    // implements FR-9 and NFR-4 of add-poem-creation
    it("maps the author's rows newest first, tagged with the author's poems tag and kept for hours", async () => {
      supabase.queueQuery(okResponse([STATION_ROW, GARDEN_ROW]));

      const result = await listAuthorPoems(AUTHOR_ID);

      expect(result).toEqual({
        ok: true,
        poems: [
          {
            id: STATION_ID,
            title: "Ночной вокзал",
            text: "Табло мигает",
            illustrationUrl: `${ILLUSTRATIONS_URL_BASE}/${ILLUSTRATION_PATH}`,
            publishedAt: "2026-10-02",
            genreId: "lyric",
          },
          {
            id: GARDEN_ID,
            title: "Осенний сад",
            text: "Листва ложится",
            illustrationUrl: null,
            publishedAt: "2026-10-01",
            genreId: null,
          },
        ],
      });
      expect(supabase.queries[0]).toEqual([
        ["from", ["poems"]],
        ["select", [POEM_COLUMNS]],
        ["eq", ["author_id", AUTHOR_ID]],
        ["order", ["created_at", { ascending: false }]],
        ["order", ["id", { ascending: true }]],
      ]);
      expect(supabase.storage.from).toHaveBeenCalledWith("poem-illustrations");
      expect(cacheTag).toHaveBeenCalledExactlyOnceWith(`poems:${AUTHOR_ID}`);
      expect(cacheLife).toHaveBeenCalledExactlyOnceWith("hours");
    });

    // implements FR-9 of add-poem-creation
    it("returns an empty list, kept for hours, for an author with no poems", async () => {
      supabase.queueQuery(okResponse([]));

      await expect(listAuthorPoems(AUTHOR_ID)).resolves.toEqual({ ok: true, poems: [] });
      expect(cacheLife).toHaveBeenCalledExactlyOnceWith("hours");
    });

    // implements FR-9 of add-poem-creation
    it("takes the publication date from the UTC date of created_at, whatever the server's time zone", async () => {
      // Ahead of UTC: 23:30Z is already the next day there.
      vi.stubEnv("TZ", "Asia/Tokyo");
      supabase.queueQuery(okResponse([GARDEN_ROW]));

      const result = await listAuthorPoems(AUTHOR_ID);

      expect(result.ok && result.poems[0].publishedAt).toBe("2026-10-01");
      vi.unstubAllEnvs();
    });

    // implements NFR-4 and NFR-10 of add-poem-creation
    it("returns unavailable, kept for seconds, on a query error, and logs no content", async () => {
      supabase.queueQuery(errorResponse("PGRST000", 503));

      await expect(listAuthorPoems(AUTHOR_ID)).resolves.toEqual({ ok: false, reason: "unavailable" });
      expect(cacheTag).toHaveBeenCalledExactlyOnceWith(`poems:${AUTHOR_ID}`);
      expect(cacheLife).toHaveBeenCalledExactlyOnceWith("seconds");
      expect(console.error).toHaveBeenCalledExactlyOnceWith("[poems] read author poems failed: unavailable");
    });

    // implements NFR-4 and NFR-10 of add-poem-creation
    it("returns unavailable on a row that fails the schema, and logs neither its title nor its text", async () => {
      supabase.queueQuery(okResponse([{ ...GARDEN_ROW, title: SECRET_TITLE, text: SECRET_TEXT, created_at: "yesterday" }]));

      await expect(listAuthorPoems(AUTHOR_ID)).resolves.toEqual({ ok: false, reason: "unavailable" });
      expect(cacheLife).toHaveBeenCalledExactlyOnceWith("seconds");
      const logged = vi.mocked(console.error).mock.calls.flat().join(" ");
      expect(logged).toBe("[poems] read author poems failed: invalid row");
      expect(logged).not.toContain(SECRET_TITLE);
      expect(logged).not.toContain(AUTHOR_ID);
    });

    it("returns unavailable on a thrown network failure", async () => {
      vi.mocked(createSupabasePublicClient).mockImplementation(() => {
        throw new TypeError("fetch failed");
      });

      await expect(listAuthorPoems(AUTHOR_ID)).resolves.toEqual({ ok: false, reason: "unavailable" });
      expect(console.error).toHaveBeenCalledExactlyOnceWith("[poems] read author poems failed: unavailable");
    });

    it("returns unavailable without logging when the config is missing, as the proxy logs it", async () => {
      vi.mocked(createSupabasePublicClient).mockImplementation(() => {
        throw new SupabaseConfigError(["NEXT_PUBLIC_SUPABASE_URL"]);
      });

      await expect(listAuthorPoems(AUTHOR_ID)).resolves.toEqual({ ok: false, reason: "unavailable" });
      expect(console.error).not.toHaveBeenCalled();
    });

    it("has no poems for a non-UUID author id, with no query and no cache scope", async () => {
      await expect(listAuthorPoems("not-a-uuid")).resolves.toEqual({ ok: true, poems: [] });
      expect(supabase.queries).toEqual([]);
      expect(cacheTag).not.toHaveBeenCalled();
    });

    it("reads an uppercase author id under the lowercase id's tag", async () => {
      supabase.queueQuery(okResponse([GARDEN_ROW]));

      await listAuthorPoems(AUTHOR_ID.toUpperCase());

      expect(supabase.queries[0]).toContainEqual(["eq", ["author_id", AUTHOR_ID]]);
      expect(cacheTag).toHaveBeenCalledExactlyOnceWith(`poems:${AUTHOR_ID}`);
    });
  });

  describe("getAuthorPoem", () => {
    // implements FR-9 of add-poem-creation
    it("returns one of the author's poems by its id", async () => {
      supabase.queueQuery(okResponse([STATION_ROW, GARDEN_ROW]));

      const result = await getAuthorPoem(AUTHOR_ID, GARDEN_ID);

      expect(result.ok && result.poem.title).toBe("Осенний сад");
    });

    // implements FR-9 of add-poem-creation
    it.each([
      ["another author's poem", OTHER_AUTHORS_POEM_ID],
      ["a random UUID", "6b1f0c2d-9e3a-4f5b-8c7d-1e2f3a4b5c6d"],
    ])("returns not-found for %s", async (_case, poemId) => {
      supabase.queueQuery(okResponse([STATION_ROW, GARDEN_ROW]));

      await expect(getAuthorPoem(AUTHOR_ID, poemId)).resolves.toEqual({ ok: false, reason: "not-found" });
    });

    // implements FR-9 of add-poem-creation
    it.each([
      ["a non-UUID id", "no-such-poem"],
      ["the uppercase spelling of the author's own poem id", GARDEN_ID.toUpperCase()],
    ])("returns not-found for %s with no query", async (_case, poemId) => {
      await expect(getAuthorPoem(AUTHOR_ID, poemId)).resolves.toEqual({ ok: false, reason: "not-found" });
      expect(supabase.queries).toEqual([]);
    });

    // implements NFR-4 of add-poem-creation
    it("returns unavailable when the list can't be read", async () => {
      supabase.queueQuery(errorResponse("PGRST000", 503));

      await expect(getAuthorPoem(AUTHOR_ID, GARDEN_ID)).resolves.toEqual({ ok: false, reason: "unavailable" });
    });

    // implements NFR-4 of add-poem-creation
    it("shares one read with the list in the same request", async () => {
      supabase.queueQuery(okResponse([STATION_ROW, GARDEN_ROW]));

      const first = getAuthorPoem(AUTHOR_ID, GARDEN_ID);
      const second = getAuthorPoem(AUTHOR_ID, GARDEN_ID);
      await listAuthorPoems(AUTHOR_ID);

      expect(second).toBe(first);
      await first;
      expect(supabase.queries).toHaveLength(1);
    });
  });
});

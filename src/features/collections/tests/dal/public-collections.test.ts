// @vitest-environment node
import { cacheLife, cacheTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { createSupabasePublicClient } from "@/shared/lib/supabase/public";

import { getPublicCollection, listAuthorCollections, listPublicCollections } from "../../dal/public-collections";

import { createFakePublicClient, errorResponse, okResponse, type FakePublicClient } from "./fake-public-client";

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
/** Has hex letters, so its uppercase spelling differs. */
const AUTUMN_ID = "5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a";
const SPRING_ID = "7a6b5c4d-3e2f-4a1b-8c9d-0e1f2a3b4c5d";
const EMPTIED_ID = "9c8b7a6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const STATION_ID = "30000000-0000-4000-8000-000000000052";
const GARDEN_ID = "c3a1b2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const SNOW_ID = "30000000-0000-4000-8000-000000000053";
const FREE_ID = "30000000-0000-4000-8000-000000000054";

const SECRET_TITLE = "Секрет";

/** The collection rows as PostgREST returns them: already newest first. */
const SPRING_ROW = {
  id: SPRING_ID,
  title: "Весна",
  description: "Первый снег",
  created_at: "2026-10-05T08:00:00.123456+00:00",
};
const AUTUMN_ROW = { id: AUTUMN_ID, title: "Осенний цикл", description: null, created_at: "2026-10-01T08:00:00+00:00" };
const EMPTIED_ROW = { id: EMPTIED_ID, title: "Пустой", description: null, created_at: "2026-09-01T08:00:00+00:00" };

function poemRow(id: string, title: string, collectionId: string | null, createdAt: string) {
  return {
    id,
    title,
    text: "Текст",
    genre_id: null,
    illustration_path: null,
    created_at: createdAt,
    collection_id: collectionId,
  };
}

/** The poems as PostgREST returns them: already newest first. */
const POEM_ROWS = [
  poemRow(FREE_ID, "Свободное", null, "2026-10-04T08:00:00+00:00"),
  poemRow(SNOW_ID, "Первый снег", SPRING_ID, "2026-10-03T08:00:00+00:00"),
  poemRow(STATION_ID, "Ночной вокзал", AUTUMN_ID, "2026-10-02T08:00:00+00:00"),
  poemRow(GARDEN_ID, "Осенний сад", AUTUMN_ID, "2026-10-01T08:00:00+00:00"),
];

let supabase: FakePublicClient;

function clearMemo(): void {
  for (const store of memoStores) store.clear();
}

function queueReads(collections: ReturnType<typeof okResponse>, poems: ReturnType<typeof okResponse>): void {
  supabase.queueQuery("collections", collections);
  supabase.queueQuery("poems", poems);
}

function queriedTables(): string[] {
  return supabase.queries.map((calls) => String(calls[0][1][0]));
}

describe("public collections DAL", () => {
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

  describe("listPublicCollections", () => {
    // implements FR-1 and NFR-2 of public-collections
    it("maps the author's rows newest first, tagged with the author's works tag and kept for hours", async () => {
      supabase.queueQuery("collections", okResponse([SPRING_ROW, AUTUMN_ROW]));

      const result = await listPublicCollections(AUTHOR_ID);

      expect(result).toEqual({
        ok: true,
        collections: [
          { id: SPRING_ID, title: "Весна", description: "Первый снег" },
          { id: AUTUMN_ID, title: "Осенний цикл", description: null },
        ],
      });
      expect(supabase.queries[0]).toEqual([
        ["from", ["collections"]],
        ["select", ["id, title, description, created_at"]],
        ["eq", ["author_id", AUTHOR_ID]],
        ["order", ["created_at", { ascending: false }]],
        ["order", ["id", { ascending: true }]],
      ]);
      expect(cacheTag).toHaveBeenCalledExactlyOnceWith(`author-works:${AUTHOR_ID}`);
      expect(cacheLife).toHaveBeenCalledExactlyOnceWith("hours");
    });

    // implements FR-1 and NFR-2 of public-collections
    it("returns an empty list, kept for hours, for an author RLS shows no collections of", async () => {
      supabase.queueQuery("collections", okResponse([]));

      await expect(listPublicCollections(AUTHOR_ID)).resolves.toEqual({ ok: true, collections: [] });
      expect(cacheLife).toHaveBeenCalledExactlyOnceWith("hours");
    });

    // implements NFR-2 and NFR-9 of public-collections
    it("returns unavailable, kept for seconds, on a query error, and logs one line with no id or title", async () => {
      supabase.queueQuery("collections", errorResponse("PGRST000", 503));

      await expect(listPublicCollections(AUTHOR_ID)).resolves.toEqual({ ok: false, reason: "unavailable" });
      expect(cacheTag).toHaveBeenCalledExactlyOnceWith(`author-works:${AUTHOR_ID}`);
      expect(cacheLife).toHaveBeenCalledExactlyOnceWith("seconds");
      expect(console.error).toHaveBeenCalledExactlyOnceWith("[collections] read public collections failed: unavailable");
    });

    // implements NFR-2 and NFR-9 of public-collections
    it.each([
      ["a malformed id", { ...SPRING_ROW, id: "not-a-uuid" }],
      ["an uppercase id", { ...SPRING_ROW, id: SPRING_ID.toUpperCase() }],
      ["an empty description", { ...SPRING_ROW, description: "" }],
      ["a bad timestamp", { ...SPRING_ROW, created_at: "yesterday" }],
    ])("returns unavailable on a row with %s, and logs neither its title nor an id", async (_case, row) => {
      supabase.queueQuery("collections", okResponse([{ ...row, title: SECRET_TITLE }]));

      await expect(listPublicCollections(AUTHOR_ID)).resolves.toEqual({ ok: false, reason: "unavailable" });
      expect(cacheLife).toHaveBeenCalledExactlyOnceWith("seconds");
      const logged = vi.mocked(console.error).mock.calls.flat().join(" ");
      expect(logged).toBe("[collections] read public collections failed: invalid row");
      expect(logged).not.toContain(SECRET_TITLE);
      expect(logged).not.toContain(AUTHOR_ID);
    });

    it("returns unavailable on a thrown network failure", async () => {
      vi.mocked(createSupabasePublicClient).mockImplementation(() => {
        throw new TypeError("fetch failed");
      });

      await expect(listPublicCollections(AUTHOR_ID)).resolves.toEqual({ ok: false, reason: "unavailable" });
      expect(console.error).toHaveBeenCalledExactlyOnceWith("[collections] read public collections failed: unavailable");
    });

    it("returns unavailable without logging when the config is missing, as the proxy logs it", async () => {
      vi.mocked(createSupabasePublicClient).mockImplementation(() => {
        throw new SupabaseConfigError(["NEXT_PUBLIC_SUPABASE_URL"]);
      });

      await expect(listPublicCollections(AUTHOR_ID)).resolves.toEqual({ ok: false, reason: "unavailable" });
      expect(console.error).not.toHaveBeenCalled();
    });

    // implements NFR-2 of public-collections
    it("has no collections for a non-UUID author id, with no query and no cache scope", async () => {
      await expect(listPublicCollections("not-a-uuid")).resolves.toEqual({ ok: true, collections: [] });
      expect(supabase.queries).toEqual([]);
      expect(cacheTag).not.toHaveBeenCalled();
    });

    // implements NFR-2 of public-collections
    it("reads an uppercase author id under the lowercase id's tag", async () => {
      supabase.queueQuery("collections", okResponse([SPRING_ROW]));

      await listPublicCollections(AUTHOR_ID.toUpperCase());

      expect(supabase.queries[0]).toContainEqual(["eq", ["author_id", AUTHOR_ID]]);
      expect(cacheTag).toHaveBeenCalledExactlyOnceWith(`author-works:${AUTHOR_ID}`);
    });
  });

  describe("listAuthorCollections", () => {
    // implements FR-1 and FR-2 of public-collections
    it("nests each collection's poems newest first, newest collection first, and leaves out free poems", async () => {
      queueReads(okResponse([SPRING_ROW, AUTUMN_ROW]), okResponse(POEM_ROWS));

      const result = await listAuthorCollections(AUTHOR_ID);

      expect(result).toEqual({
        ok: true,
        collections: [
          {
            id: SPRING_ID,
            title: "Весна",
            description: "Первый снег",
            poems: [{ id: SNOW_ID, title: "Первый снег" }],
          },
          {
            id: AUTUMN_ID,
            title: "Осенний цикл",
            description: null,
            poems: [
              { id: STATION_ID, title: "Ночной вокзал" },
              { id: GARDEN_ID, title: "Осенний сад" },
            ],
          },
        ],
      });
    });

    // implements FR-1 of public-collections
    it("drops a listed collection whose poems are gone", async () => {
      queueReads(okResponse([SPRING_ROW, EMPTIED_ROW]), okResponse(POEM_ROWS));

      const result = await listAuthorCollections(AUTHOR_ID);

      expect(result.ok && result.collections.map((collection) => collection.id)).toEqual([SPRING_ID]);
    });

    // implements NFR-2 of public-collections
    it("reads the collections table once and the poems table once", async () => {
      queueReads(okResponse([SPRING_ROW]), okResponse(POEM_ROWS));

      await listAuthorCollections(AUTHOR_ID);

      expect(queriedTables().sort()).toEqual(["collections", "poems"]);
    });

    // implements FR-4 of public-collections
    it("says the poems are unavailable when the poems read fails, even if the collections read fails too", async () => {
      queueReads(errorResponse("PGRST000", 503), errorResponse("PGRST000", 503));

      await expect(listAuthorCollections(AUTHOR_ID)).resolves.toEqual({ ok: false, reason: "poems-unavailable" });
    });

    // implements FR-4 of public-collections
    it("says the collections are unavailable, and that a poem is collected, when only that read fails", async () => {
      queueReads(errorResponse("PGRST000", 503), okResponse(POEM_ROWS));

      await expect(listAuthorCollections(AUTHOR_ID)).resolves.toEqual({
        ok: false,
        reason: "collections-unavailable",
        hasCollectedPoems: true,
      });
    });

    // implements FR-4 of public-collections
    it("says the collections are unavailable, and that no poem is collected, for all-free poems", async () => {
      queueReads(errorResponse("PGRST000", 503), okResponse([POEM_ROWS[0]]));

      await expect(listAuthorCollections(AUTHOR_ID)).resolves.toEqual({
        ok: false,
        reason: "collections-unavailable",
        hasCollectedPoems: false,
      });
    });

    it("has no collections for a non-UUID author id", async () => {
      await expect(listAuthorCollections("not-a-uuid")).resolves.toEqual({ ok: true, collections: [] });
      expect(supabase.queries).toEqual([]);
    });
  });

  describe("getPublicCollection", () => {
    // implements FR-5 of public-collections
    it("returns one visible collection with its poems", async () => {
      queueReads(okResponse([SPRING_ROW, AUTUMN_ROW]), okResponse(POEM_ROWS));

      const result = await getPublicCollection(AUTHOR_ID, AUTUMN_ID);

      expect(result.ok && result.collection.poems.map((poem) => poem.title)).toEqual(["Ночной вокзал", "Осенний сад"]);
    });

    // implements FR-5 of public-collections
    it.each([
      ["an unknown collection", "6b1f0c2d-9e3a-4f5b-8c7d-1e2f3a4b5c6d"],
      ["an emptied collection", EMPTIED_ID],
    ])("returns not-found for %s", async (_case, collectionId) => {
      queueReads(okResponse([SPRING_ROW, EMPTIED_ROW]), okResponse(POEM_ROWS));

      await expect(getPublicCollection(AUTHOR_ID, collectionId)).resolves.toEqual({ ok: false, reason: "not-found" });
    });

    // implements FR-5 of public-collections
    it.each([
      ["a non-UUID id", "no-such-collection"],
      ["the uppercase spelling of a collection id", AUTUMN_ID.toUpperCase()],
    ])("returns not-found for %s with no query", async (_case, collectionId) => {
      await expect(getPublicCollection(AUTHOR_ID, collectionId)).resolves.toEqual({ ok: false, reason: "not-found" });
      expect(supabase.queries).toEqual([]);
    });

    // implements FR-5 of public-collections
    it.each([
      ["the collections read fails", errorResponse("PGRST000", 503), okResponse(POEM_ROWS)],
      ["the poems read fails", okResponse([SPRING_ROW]), errorResponse("PGRST000", 503)],
    ])("returns unavailable when %s", async (_case, collections, poems) => {
      queueReads(collections, poems);

      await expect(getPublicCollection(AUTHOR_ID, SPRING_ID)).resolves.toEqual({ ok: false, reason: "unavailable" });
    });

    // implements NFR-2 of public-collections
    it("shares one read between the page and its trail in the same request", async () => {
      queueReads(okResponse([SPRING_ROW]), okResponse(POEM_ROWS));

      const first = getPublicCollection(AUTHOR_ID, SPRING_ID);
      const second = getPublicCollection(AUTHOR_ID, SPRING_ID);
      await listAuthorCollections(AUTHOR_ID);

      expect(second).toBe(first);
      await first;
      expect(supabase.queries).toHaveLength(2);
    });
  });
});

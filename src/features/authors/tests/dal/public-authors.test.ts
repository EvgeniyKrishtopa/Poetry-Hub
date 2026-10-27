// @vitest-environment node
import { cacheLife, cacheTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { createSupabasePublicClient } from "@/shared/lib/supabase/public";

import { getPublicAuthorName } from "../../dal/public-author-name";
import { getPublicAuthor, listPublicAuthors } from "../../dal/public-authors";
import { PUBLIC_AUTHOR_COLUMNS } from "../../model/author.constants";

import { createFakeSupabase, errorResponse, okResponse, PUBLIC_URL_BASE, type FakeSupabase } from "./fake-supabase";

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

const ANNA_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const BORIS_ID = "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f";
const PHOTO_PATH = `${ANNA_ID}/0b7c1d2e-3f40-4a5b-8c6d-7e8f9a0b1c2d.jpg`;

function row(id: string, first: string, last: string, photoPath: string | null = null) {
  return { id, first_name: first, last_name: last, about: null, photo_path: photoPath };
}

let supabase: FakeSupabase;

describe("public authors", () => {
  beforeEach(() => {
    for (const store of memoStores) store.clear();
    supabase = createFakeSupabase();
    vi.mocked(createSupabasePublicClient).mockReturnValue(supabase.client);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("listPublicAuthors", () => {
    // implements FR-13, FR-17, NFR-7 of add-author-profiles
    it("maps and sorts the public rows, tagged with the directory tag and cached for hours", async () => {
      supabase.queueQuery(okResponse([row(BORIS_ID, "Борис", "Пастернак"), row(ANNA_ID, "Анна", "Ахматова", PHOTO_PATH)]));

      const result = await listPublicAuthors();

      expect(result).toEqual({
        ok: true,
        authors: [
          {
            id: ANNA_ID,
            firstName: "Анна",
            lastName: "Ахматова",
            about: null,
            photoUrl: `${PUBLIC_URL_BASE}/${PHOTO_PATH}`,
          },
          { id: BORIS_ID, firstName: "Борис", lastName: "Пастернак", about: null, photoUrl: null },
        ],
      });
      expect(supabase.queries[0]).toEqual([
        ["from", ["author_profiles"]],
        ["select", [PUBLIC_AUTHOR_COLUMNS]],
      ]);
      expect(cacheTag).toHaveBeenCalledExactlyOnceWith("authors");
      expect(cacheLife).toHaveBeenCalledExactlyOnceWith("hours");
    });

    it("returns an empty list when there are no public rows", async () => {
      supabase.queueQuery(okResponse([]));

      await expect(listPublicAuthors()).resolves.toEqual({ ok: true, authors: [] });
      expect(cacheLife).toHaveBeenCalledWith("hours");
    });

    it("never carries user_id: the column list leaves it out", () => {
      expect(PUBLIC_AUTHOR_COLUMNS).not.toContain("user_id");
      expect(PUBLIC_AUTHOR_COLUMNS).not.toContain("*");
    });

    it("leaves out a row missing a name", async () => {
      supabase.queueQuery(okResponse([{ ...row(ANNA_ID, "Анна", "Ахматова"), last_name: null }]));

      await expect(listPublicAuthors()).resolves.toEqual({ ok: true, authors: [] });
    });

    // implements NFR-3, NFR-7 of add-author-profiles
    it("returns unavailable, cached for seconds and logged by name, on a Supabase error", async () => {
      supabase.queueQuery(errorResponse("", 503));

      await expect(listPublicAuthors()).resolves.toEqual({ ok: false, reason: "unavailable" });
      expect(cacheLife).toHaveBeenCalledExactlyOnceWith("seconds");
      expect(cacheTag).toHaveBeenCalledWith("authors");
      expect(console.error).toHaveBeenCalledWith("[authors] list public authors failed: PostgrestError");
    });

    it("returns unavailable for malformed rows", async () => {
      supabase.queueQuery(okResponse([{ id: ANNA_ID }]));

      await expect(listPublicAuthors()).resolves.toEqual({ ok: false, reason: "unavailable" });
      expect(console.error).toHaveBeenCalledWith("[authors] list public authors failed: ZodError");
    });

    it("returns unavailable without logging when the config is missing", async () => {
      vi.mocked(createSupabasePublicClient).mockImplementation(() => {
        throw new SupabaseConfigError(["NEXT_PUBLIC_SUPABASE_URL"]);
      });

      await expect(listPublicAuthors()).resolves.toEqual({ ok: false, reason: "unavailable" });
      expect(cacheLife).toHaveBeenCalledWith("seconds");
      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe("getPublicAuthor", () => {
    // implements FR-14, FR-17, NFR-7 of add-author-profiles, FR-14 of add-author-poems
    it("returns the public row by id, tagged with that author's tag only and cached for hours", async () => {
      supabase.queueQuery(okResponse(row(ANNA_ID, "Анна", "Ахматова")));

      await expect(getPublicAuthor(ANNA_ID)).resolves.toMatchObject({
        ok: true,
        author: { id: ANNA_ID, firstName: "Анна", lastName: "Ахматова" },
      });
      expect(supabase.queries[0]).toEqual([
        ["from", ["author_profiles"]],
        ["select", [PUBLIC_AUTHOR_COLUMNS]],
        ["eq", ["id", ANNA_ID]],
        ["maybeSingle", []],
      ]);
      expect(cacheTag).toHaveBeenCalledExactlyOnceWith(`author:${ANNA_ID}`);
      expect(cacheLife).toHaveBeenCalledExactlyOnceWith("hours");
    });

    it.each(["not-a-uuid", "", `${ANNA_ID}/../x`])("returns not-found for %j without a client call or cache scope", async (id) => {
      await expect(getPublicAuthor(id)).resolves.toEqual({ ok: false, reason: "not-found" });
      expect(createSupabasePublicClient).not.toHaveBeenCalled();
      expect(cacheTag).not.toHaveBeenCalled();
    });

    // implements FR-14 of add-author-poems
    it("returns not-found, cached for minutes, for a missing or non-public row", async () => {
      supabase.queueQuery(okResponse(null));

      await expect(getPublicAuthor(ANNA_ID)).resolves.toEqual({ ok: false, reason: "not-found" });
      expect(cacheLife).toHaveBeenCalledExactlyOnceWith("minutes");
    });

    it("returns not-found for a row missing a name", async () => {
      supabase.queueQuery(okResponse({ ...row(ANNA_ID, "Анна", "Ахматова"), first_name: null }));

      await expect(getPublicAuthor(ANNA_ID)).resolves.toEqual({ ok: false, reason: "not-found" });
    });

    // implements NFR-3, NFR-7 of add-author-profiles, FR-14 of add-author-poems
    it("returns unavailable, cached for seconds and logged once by name, on a Supabase error", async () => {
      supabase.queueQuery(errorResponse("PGRST000", 503));

      await expect(getPublicAuthor(ANNA_ID)).resolves.toEqual({ ok: false, reason: "unavailable" });
      expect(cacheLife).toHaveBeenCalledExactlyOnceWith("seconds");
      expect(console.error).toHaveBeenCalledExactlyOnceWith("[authors] read public author failed: PostgrestError PGRST000");
    });

    // implements FR-12 of add-author-poems
    it("reads Supabase once per request for the same id and gives every caller the same result", async () => {
      supabase.queueQuery(okResponse(row(ANNA_ID, "Анна", "Ахматова")));

      const [first, second] = await Promise.all([getPublicAuthor(ANNA_ID), getPublicAuthor(ANNA_ID)]);

      expect(supabase.queries).toHaveLength(1);
      expect(second).toBe(first);
    });

    // implements FR-12 of add-author-poems
    it("serves getPublicAuthorName from the same read", async () => {
      supabase.queueQuery(okResponse(row(ANNA_ID, "Анна", "Ахматова")));

      await getPublicAuthor(ANNA_ID);
      await expect(getPublicAuthorName(ANNA_ID)).resolves.toEqual({ ok: true, name: "Анна Ахматова" });

      expect(supabase.queries).toHaveLength(1);
    });

    // implements FR-12 of add-author-poems
    it("returns one failed read to both callers instead of reading again", async () => {
      supabase.queueQuery(errorResponse("PGRST000", 503));

      const results = await Promise.all([getPublicAuthor(ANNA_ID), getPublicAuthorName(ANNA_ID)]);

      expect(results).toEqual([
        { ok: false, reason: "unavailable" },
        { ok: false, reason: "unavailable" },
      ]);
      expect(supabase.queries).toHaveLength(1);
      expect(console.error).toHaveBeenCalledOnce();
    });

    it("returns unavailable for a malformed row", async () => {
      supabase.queueQuery(okResponse({ id: ANNA_ID }));

      await expect(getPublicAuthor(ANNA_ID)).resolves.toEqual({ ok: false, reason: "unavailable" });
    });

    it("returns unavailable when the client throws", async () => {
      vi.mocked(createSupabasePublicClient).mockImplementation(() => {
        throw new TypeError("fetch failed");
      });

      await expect(getPublicAuthor(ANNA_ID)).resolves.toEqual({ ok: false, reason: "unavailable" });
      expect(console.error).toHaveBeenCalledWith("[authors] read public author failed: TypeError");
    });
  });
});

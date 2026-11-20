// @vitest-environment node
import { cacheLife, cacheTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { createSupabasePublicClient } from "@/shared/lib/supabase/public";

import { listPublicPoemRefs } from "../../dal/public-poem-refs";

import { createFakePublicClient, errorResponse, okResponse, type FakePublicClient } from "./fake-public-client";

vi.mock("@/shared/lib/supabase/public", () => ({ createSupabasePublicClient: vi.fn() }));

const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const COLLECTION_ID = "5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a";
const FIRST_POEM_ID = "30000000-0000-4000-8000-000000000052";
const SECOND_POEM_ID = "30000000-0000-4000-8000-000000000053";

const FULL_PAGE_SIZE = 1000;
const CAPPED_PAGE_SIZE = 100;
const MANY_POEMS = 2500;
const UUID_SUFFIX_LENGTH = 12;
const HEX_RADIX = 16;
const HTTP_SERVER_ERROR = 500;

/** The `index`-th row of a generated list: a valid lowercase id, always the same author, free. */
function rowAt(index: number) {
  const suffix = index.toString(HEX_RADIX).padStart(UUID_SUFFIX_LENGTH, "0");
  return { id: `00000000-0000-4000-8000-${suffix}`, author_id: AUTHOR_ID, collection_id: null };
}

function rows(count: number, firstIndex = 0) {
  return Array.from({ length: count }, (_, offset) => rowAt(firstIndex + offset));
}

/** The `range(from, to)` arguments of every query the read sent, in order. */
function rangesAsked(supabase: FakePublicClient): unknown[] {
  return supabase.queries.map((calls) => calls.find(([method]) => method === "range")?.[1]);
}

let supabase: FakePublicClient;

describe("public poem refs DAL", () => {
  beforeEach(() => {
    supabase = createFakePublicClient();
    vi.mocked(createSupabasePublicClient).mockReturnValue(supabase.client);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // implements FR-9 of seo-metadata
  it("maps the ids of one page, asks for the id columns ordered by id, and stops at the next empty page", async () => {
    supabase.queueQuery(
      okResponse([
        { id: FIRST_POEM_ID, author_id: AUTHOR_ID, collection_id: COLLECTION_ID },
        { id: SECOND_POEM_ID, author_id: AUTHOR_ID, collection_id: null },
      ]),
    );
    supabase.queueQuery(okResponse([]));

    const result = await listPublicPoemRefs();

    expect(result).toEqual({
      ok: true,
      refs: [
        { id: FIRST_POEM_ID, authorId: AUTHOR_ID, collectionId: COLLECTION_ID },
        { id: SECOND_POEM_ID, authorId: AUTHOR_ID, collectionId: null },
      ],
    });
    expect(supabase.queries[0]).toEqual([
      ["from", ["poems"]],
      ["select", ["id, author_id, collection_id"]],
      ["order", ["id", { ascending: true }]],
      ["range", [0, FULL_PAGE_SIZE - 1]],
    ]);
    expect(supabase.queries).toHaveLength(2);
  });

  // implements FR-9 of seo-metadata
  it("returns an empty list when there is no public poem", async () => {
    supabase.queueQuery(okResponse([]));

    await expect(listPublicPoemRefs()).resolves.toEqual({ ok: true, refs: [] });
  });

  // implements FR-9 of seo-metadata
  it("lists all 2500 poems across pages of 1000", async () => {
    supabase.queueQuery(okResponse(rows(FULL_PAGE_SIZE, 0)));
    supabase.queueQuery(okResponse(rows(FULL_PAGE_SIZE, FULL_PAGE_SIZE)));
    supabase.queueQuery(okResponse(rows(MANY_POEMS - 2 * FULL_PAGE_SIZE, 2 * FULL_PAGE_SIZE)));
    supabase.queueQuery(okResponse([]));

    const result = await listPublicPoemRefs();

    expect(result.ok && result.refs).toHaveLength(MANY_POEMS);
    expect(result.ok && new Set(result.refs.map((ref) => ref.id)).size).toBe(MANY_POEMS);
    expect(rangesAsked(supabase)).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
      [2500, 3499],
    ]);
  });

  // implements FR-9 of seo-metadata
  it("loses no poem when the database caps a response below the page size", async () => {
    supabase.queueQuery(okResponse(rows(CAPPED_PAGE_SIZE, 0)));
    supabase.queueQuery(okResponse(rows(CAPPED_PAGE_SIZE, CAPPED_PAGE_SIZE)));
    supabase.queueQuery(okResponse(rows(CAPPED_PAGE_SIZE / 2, 2 * CAPPED_PAGE_SIZE)));
    supabase.queueQuery(okResponse([]));

    const result = await listPublicPoemRefs();

    const expectedCount = 2.5 * CAPPED_PAGE_SIZE;
    expect(result.ok && result.refs).toHaveLength(expectedCount);
    // Each page starts after the rows actually received, not after the rows asked for.
    expect(rangesAsked(supabase)).toEqual([
      [0, 999],
      [100, 1099],
      [200, 1199],
      [250, 1249],
    ]);
  });

  // implements FR-9 of seo-metadata
  it("fails the whole read when a later page errors, with no partial list", async () => {
    supabase.queueQuery(okResponse(rows(FULL_PAGE_SIZE, 0)));
    supabase.queueQuery(errorResponse("PGRST000", HTTP_SERVER_ERROR));

    await expect(listPublicPoemRefs()).resolves.toEqual({ ok: false, reason: "unavailable" });
  });

  // implements FR-9 of seo-metadata
  it("fails the whole read when the first page errors", async () => {
    supabase.queueQuery(errorResponse("PGRST000", HTTP_SERVER_ERROR));

    await expect(listPublicPoemRefs()).resolves.toEqual({ ok: false, reason: "unavailable" });
  });

  // implements FR-9 of seo-metadata
  it("fails the read on a row that is not a lowercase UUID, logging the kind and no value", async () => {
    supabase.queueQuery(okResponse([{ id: "NOT-A-UUID", author_id: AUTHOR_ID, collection_id: null }]));

    await expect(listPublicPoemRefs()).resolves.toEqual({ ok: false, reason: "unavailable" });
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[poems] read public poem refs failed: invalid row");
  });

  // implements FR-9 of seo-metadata
  it("fails the read when the client throws, and stays silent for a missing Supabase config", async () => {
    vi.mocked(createSupabasePublicClient).mockImplementation(() => {
      throw new SupabaseConfigError(["NEXT_PUBLIC_SUPABASE_URL"]);
    });

    await expect(listPublicPoemRefs()).resolves.toEqual({ ok: false, reason: "unavailable" });
    expect(console.error).not.toHaveBeenCalled();
  });

  // implements NFR-5 of seo-metadata
  it("keeps a success for hours and a failure for seconds, under no tag", async () => {
    supabase.queueQuery(okResponse([]));
    await listPublicPoemRefs();
    expect(cacheLife).toHaveBeenLastCalledWith("hours");

    vi.clearAllMocks();
    supabase.queueQuery(errorResponse("PGRST000", HTTP_SERVER_ERROR));
    await listPublicPoemRefs();

    expect(cacheLife).toHaveBeenCalledExactlyOnceWith("seconds");
    expect(cacheTag).not.toHaveBeenCalled();
  });
});

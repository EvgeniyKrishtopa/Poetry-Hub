// @vitest-environment node
import { cacheLife, cacheTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSupabasePublicClient } from "@/shared/lib/supabase/public";

import { listLatestPoems } from "../../dal/latest-poems";
import { POEM_SUMMARY_COLUMNS } from "../../model/poem.constants";

import { createFakePublicClient, errorResponse, okResponse, type FakePublicClient } from "./fake-public-client";

vi.mock("@/shared/lib/supabase/public", () => ({ createSupabasePublicClient: vi.fn() }));

const FIRST_AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const SECOND_AUTHOR_ID = "1679091c-5a88-4faf-b5e5-1c2b3a4d5e6f";
const NEWEST_ID = "30000000-0000-4000-8000-000000000052";
const OLDER_ID = "c3a1b2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const LIMIT = 4;

/** The rows as PostgREST returns them: already newest first. */
const NEWEST_ROW = {
  id: NEWEST_ID,
  author_id: FIRST_AUTHOR_ID,
  title: "Ночной вокзал",
  illustration_path: null,
  created_at: "2026-10-02T08:00:00+00:00",
};
const OLDER_ROW = {
  id: OLDER_ID,
  author_id: SECOND_AUTHOR_ID,
  title: "Осенний сад",
  illustration_path: null,
  created_at: "2026-10-01T23:30:00+00:00",
};

let supabase: FakePublicClient;

describe("latest poems DAL", () => {
  beforeEach(() => {
    supabase = createFakePublicClient();
    vi.mocked(createSupabasePublicClient).mockReturnValue(supabase.client);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // implements FR-5 of home-page-sections
  it("asks for the newest first, by created_at then id, at most the limit, and keeps the database's order", async () => {
    supabase.queueQuery(okResponse([NEWEST_ROW, OLDER_ROW]));

    const result = await listLatestPoems(LIMIT);

    expect(result.ok && result.poems.map((poem) => poem.id)).toEqual([NEWEST_ID, OLDER_ID]);
    expect(supabase.queries).toEqual([
      [
        ["from", ["poems"]],
        ["select", [POEM_SUMMARY_COLUMNS]],
        ["order", ["created_at", { ascending: false }]],
        ["order", ["id", { ascending: false }]],
        ["limit", [LIMIT]],
      ],
    ]);
  });

  // implements FR-5 of home-page-sections
  it("answers an empty list, kept for minutes and tagged with nothing, when there are no poems", async () => {
    supabase.queueQuery(okResponse([]));

    await expect(listLatestPoems(LIMIT)).resolves.toEqual({ ok: true, poems: [] });

    expect(cacheLife).toHaveBeenCalledExactlyOnceWith("minutes");
    expect(cacheTag).not.toHaveBeenCalled();
  });

  // implements FR-5 of home-page-sections
  it("lists only what the public client returns, so a poem of a non-public author is absent", async () => {
    supabase.queueQuery(okResponse([OLDER_ROW]));

    const result = await listLatestPoems(LIMIT);

    expect(result.ok && result.poems.map((poem) => poem.id)).toEqual([OLDER_ID]);
  });

  // implements FR-12 of home-page-sections
  it("keeps the entry for minutes and tags it with the works tag of each listed author", async () => {
    supabase.queueQuery(okResponse([NEWEST_ROW, OLDER_ROW]));

    await listLatestPoems(LIMIT);

    expect(cacheLife).toHaveBeenCalledExactlyOnceWith("minutes");
    expect(cacheTag).toHaveBeenCalledExactlyOnceWith(`author-works:${FIRST_AUTHOR_ID}`, `author-works:${SECOND_AUTHOR_ID}`);
  });

  // implements FR-12 of home-page-sections
  it("answers unavailable for a database error, kept for seconds, and logs the kind only", async () => {
    supabase.queueQuery(errorResponse("57014", 500));

    await expect(listLatestPoems(LIMIT)).resolves.toEqual({ ok: false, reason: "unavailable" });

    expect(cacheLife).toHaveBeenCalledExactlyOnceWith("seconds");
    expect(cacheTag).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledTimes(1);
    const line = String(vi.mocked(console.error).mock.calls[0][0]);
    expect(line).toMatch(/^\[poems\] read latest poems failed: /);
    expect(line).not.toContain("Секрет");
  });

  // implements FR-12 of home-page-sections
  it("answers unavailable for a row that fails its schema", async () => {
    supabase.queueQuery(okResponse([{ ...NEWEST_ROW, author_id: "not-a-uuid" }]));

    await expect(listLatestPoems(LIMIT)).resolves.toEqual({ ok: false, reason: "unavailable" });

    expect(cacheLife).toHaveBeenCalledExactlyOnceWith("seconds");
  });
});

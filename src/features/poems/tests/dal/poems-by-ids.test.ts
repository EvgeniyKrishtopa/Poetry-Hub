// @vitest-environment node
import { cacheLife, cacheTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { createSupabasePublicClient } from "@/shared/lib/supabase/public";

import { listPoemsByIds } from "../../dal/poems-by-ids";
import { POEM_SUMMARY_COLUMNS } from "../../model/poem.constants";

import { createFakePublicClient, errorResponse, ILLUSTRATIONS_URL_BASE, okResponse, type FakePublicClient } from "./fake-public-client";

vi.mock("@/shared/lib/supabase/public", () => ({ createSupabasePublicClient: vi.fn() }));

const FIRST_AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const SECOND_AUTHOR_ID = "1679091c-5a88-4faf-b5e5-1c2b3a4d5e6f";
const STATION_ID = "30000000-0000-4000-8000-000000000052";
const GARDEN_ID = "c3a1b2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const HIDDEN_ID = "30000000-0000-4000-8000-000000000099";
const ILLUSTRATION_PATH = `${FIRST_AUTHOR_ID}/0b7c1d2e-3f40-4a5b-8c6d-7e8f9a0b1c2d.jpg`;
const SECRET_TITLE = "Секрет";

const STATION_ROW = {
  id: STATION_ID,
  author_id: FIRST_AUTHOR_ID,
  title: "Ночной вокзал",
  illustration_path: ILLUSTRATION_PATH,
  created_at: "2026-10-02T08:00:00.123456+00:00",
};
const GARDEN_ROW = {
  id: GARDEN_ID,
  author_id: SECOND_AUTHOR_ID,
  title: "Осенний сад",
  illustration_path: null,
  created_at: "2026-10-01T23:30:00+00:00",
};

let supabase: FakePublicClient;

describe("poems by ids DAL", () => {
  beforeEach(() => {
    supabase = createFakePublicClient();
    vi.mocked(createSupabasePublicClient).mockReturnValue(supabase.client);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // implements FR-2 of home-page-sections
  it("returns the poems in the requested order, whatever order the database answers in, with one in(...) read", async () => {
    supabase.queueQuery(okResponse([STATION_ROW, GARDEN_ROW]));

    const result = await listPoemsByIds([GARDEN_ID, STATION_ID]);

    expect(result).toEqual({
      ok: true,
      poems: [
        {
          id: GARDEN_ID,
          authorId: SECOND_AUTHOR_ID,
          title: "Осенний сад",
          illustrationUrl: null,
          createdAt: "2026-10-01T23:30:00+00:00",
        },
        {
          id: STATION_ID,
          authorId: FIRST_AUTHOR_ID,
          title: "Ночной вокзал",
          illustrationUrl: `${ILLUSTRATIONS_URL_BASE}/${ILLUSTRATION_PATH}`,
          createdAt: "2026-10-02T08:00:00.123456+00:00",
        },
      ],
    });
    expect(supabase.queries).toEqual([
      [
        ["from", ["poems"]],
        ["select", [POEM_SUMMARY_COLUMNS]],
        ["in", ["id", [GARDEN_ID, STATION_ID]]],
      ],
    ]);
  });

  // implements FR-2 of home-page-sections
  it("leaves out a poem the public client did not return, such as one of a non-public author", async () => {
    supabase.queueQuery(okResponse([GARDEN_ROW]));

    const result = await listPoemsByIds([STATION_ID, HIDDEN_ID, GARDEN_ID]);

    expect(result.ok && result.poems.map((poem) => poem.id)).toEqual([GARDEN_ID]);
  });

  // implements FR-12 of home-page-sections
  it("keeps the entry for hours and tags it with the works tag of each author in the result, once", async () => {
    supabase.queueQuery(okResponse([STATION_ROW, { ...GARDEN_ROW, author_id: FIRST_AUTHOR_ID }]));

    await listPoemsByIds([STATION_ID, GARDEN_ID]);

    expect(cacheTag).toHaveBeenCalledExactlyOnceWith(`author-works:${FIRST_AUTHOR_ID}`);
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith("hours");
  });

  // implements FR-12 of home-page-sections
  it("tags the entry with the author of the poems that came back and no one else's", async () => {
    supabase.queueQuery(okResponse([GARDEN_ROW]));

    await listPoemsByIds([STATION_ID, GARDEN_ID]);

    expect(cacheTag).toHaveBeenCalledExactlyOnceWith(`author-works:${SECOND_AUTHOR_ID}`);
  });

  // implements FR-2 of home-page-sections
  it("answers an empty list for an empty request without a read", async () => {
    await expect(listPoemsByIds([])).resolves.toEqual({ ok: true, poems: [] });

    expect(createSupabasePublicClient).not.toHaveBeenCalled();
    expect(cacheLife).not.toHaveBeenCalled();
  });

  // implements FR-2 of home-page-sections
  it("refuses a request holding an id that is not a UUID before any query", async () => {
    const result = await listPoemsByIds([STATION_ID, "not-a-uuid"]);

    expect(result).toEqual({ ok: true, poems: [] });
    expect(createSupabasePublicClient).not.toHaveBeenCalled();
    expect(supabase.queries).toEqual([]);
    expect(cacheLife).not.toHaveBeenCalled();
  });

  // implements FR-12 of home-page-sections
  it("answers unavailable for a database error, kept for seconds and tagged with nothing", async () => {
    supabase.queueQuery(errorResponse("57014", 500));

    await expect(listPoemsByIds([STATION_ID])).resolves.toEqual({ ok: false, reason: "unavailable" });

    expect(cacheLife).toHaveBeenCalledExactlyOnceWith("seconds");
    expect(cacheTag).not.toHaveBeenCalled();
  });

  // implements FR-12 of home-page-sections
  it("answers unavailable for a row that fails its schema", async () => {
    supabase.queueQuery(okResponse([{ ...STATION_ROW, title: "" }]));

    await expect(listPoemsByIds([STATION_ID])).resolves.toEqual({ ok: false, reason: "unavailable" });

    expect(cacheLife).toHaveBeenCalledExactlyOnceWith("seconds");
  });

  // implements FR-12 of home-page-sections
  it("logs a database error by kind only, never an id or the database's message", async () => {
    supabase.queueQuery(errorResponse("57014", 500));

    await listPoemsByIds([STATION_ID]);

    expect(console.error).toHaveBeenCalledTimes(1);
    const line = String(vi.mocked(console.error).mock.calls[0][0]);
    expect(line).toMatch(/^\[poems\] read poems by ids failed: /);
    expect(line).not.toContain(STATION_ID);
    expect(line).not.toContain("failing row contains");
  });

  // implements FR-12 of home-page-sections
  it("logs a row that fails its schema by kind only, never the title in that row or its id", async () => {
    supabase.queueQuery(okResponse([{ ...STATION_ROW, title: SECRET_TITLE, author_id: "not-a-uuid" }]));

    await listPoemsByIds([STATION_ID]);

    expect(console.error).toHaveBeenCalledTimes(1);
    const line = String(vi.mocked(console.error).mock.calls[0][0]);
    expect(line).toBe("[poems] read poems by ids failed: invalid row");
    expect(line).not.toContain(SECRET_TITLE);
    expect(line).not.toContain(STATION_ID);
  });

  // implements FR-12 of home-page-sections
  it("answers unavailable without a log line when the Supabase configuration is missing, because the proxy logs it", async () => {
    vi.mocked(createSupabasePublicClient).mockImplementation(() => {
      throw new SupabaseConfigError(["NEXT_PUBLIC_SUPABASE_URL"]);
    });

    await expect(listPoemsByIds([STATION_ID])).resolves.toEqual({ ok: false, reason: "unavailable" });

    expect(console.error).not.toHaveBeenCalled();
    expect(cacheLife).toHaveBeenCalledExactlyOnceWith("seconds");
  });

  // implements FR-12 of home-page-sections
  it("answers unavailable and logs once when the client throws an error that is not a configuration error", async () => {
    vi.mocked(createSupabasePublicClient).mockImplementation(() => {
      throw new TypeError("fetch failed");
    });

    await expect(listPoemsByIds([STATION_ID])).resolves.toEqual({ ok: false, reason: "unavailable" });

    expect(console.error).toHaveBeenCalledTimes(1);
    const line = String(vi.mocked(console.error).mock.calls[0][0]);
    expect(line).toMatch(/^\[poems\] read poems by ids failed: /);
    expect(line).not.toContain("fetch failed");
  });
});

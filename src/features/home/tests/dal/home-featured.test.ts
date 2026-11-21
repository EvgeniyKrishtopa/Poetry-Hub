// @vitest-environment node
import { cacheLife, cacheTag } from "next/cache";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HOME_FEATURED_TAG } from "@/shared/config/cache-tags";
import { createSupabasePublicClient } from "@/shared/lib/supabase/public";

import { getHomeFeaturedIds } from "../../dal/home-featured";

vi.mock("@/shared/lib/supabase/public", () => ({ createSupabasePublicClient: vi.fn() }));

const FIRST_POEM_ID = "30000000-0000-4000-8000-000000000052";
const SECOND_POEM_ID = "c3a1b2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const SECRET_VALUE = "Секрет";
const HTTP_OK = 200;
const HTTP_SERVER_ERROR = 500;

const rpc = vi.fn();

describe("home featured ids DAL", () => {
  beforeEach(() => {
    vi.mocked(createSupabasePublicClient).mockReturnValue({ rpc } as unknown as ReturnType<typeof createSupabasePublicClient>);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  function loggedLine(): string {
    expect(console.error).toHaveBeenCalledTimes(1);
    return String(vi.mocked(console.error).mock.calls[0][0]);
  }

  // implements FR-2, FR-4 of home-page-sections
  it("calls the ids function and returns both lists in the answered order", async () => {
    rpc.mockResolvedValue({
      data: { poem_ids: [SECOND_POEM_ID, FIRST_POEM_ID], author_ids: [AUTHOR_ID] },
      error: null,
      status: HTTP_OK,
    });

    const result = await getHomeFeaturedIds();

    expect(rpc).toHaveBeenCalledExactlyOnceWith("home_featured_ids");
    expect(result).toEqual({ ok: true, ids: { poemIds: [SECOND_POEM_ID, FIRST_POEM_ID], authorIds: [AUTHOR_ID] } });
  });

  // implements FR-10, FR-11, FR-12 of home-page-sections
  it("keeps a success for hours, tagged with the home choice", async () => {
    rpc.mockResolvedValue({ data: { poem_ids: [], author_ids: [] }, error: null, status: HTTP_OK });

    await expect(getHomeFeaturedIds()).resolves.toEqual({ ok: true, ids: { poemIds: [], authorIds: [] } });

    expect(cacheLife).toHaveBeenCalledExactlyOnceWith("hours");
    expect(cacheTag).toHaveBeenCalledExactlyOnceWith(HOME_FEATURED_TAG);
  });

  // implements FR-7, FR-12 of home-page-sections
  it("answers a failure for a database error, kept for seconds, and logs the kind only", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: "57014", message: `failing row contains (${SECRET_VALUE})`, details: "", hint: "" },
      status: HTTP_SERVER_ERROR,
    });

    await expect(getHomeFeaturedIds()).resolves.toEqual({ ok: false });

    expect(cacheLife).toHaveBeenCalledExactlyOnceWith("seconds");
    expect(cacheTag).toHaveBeenCalledExactlyOnceWith(HOME_FEATURED_TAG);
    const line = loggedLine();
    expect(line).toBe("[home] read featured ids failed: unavailable");
    expect(line).not.toContain(SECRET_VALUE);
  });

  // implements FR-7, FR-12 of home-page-sections
  it("answers a failure for an answer that does not match the schema, and logs the kind only", async () => {
    rpc.mockResolvedValue({
      data: { poem_ids: [SECRET_VALUE], author_ids: [] },
      error: null,
      status: HTTP_OK,
    });

    await expect(getHomeFeaturedIds()).resolves.toEqual({ ok: false });

    expect(cacheLife).toHaveBeenCalledExactlyOnceWith("seconds");
    const line = loggedLine();
    expect(line).toBe("[home] read featured ids failed: invalid answer");
    expect(line).not.toContain(SECRET_VALUE);
  });

  // implements FR-7 of home-page-sections
  it("answers a failure for more than four ids, since the database never answers more", async () => {
    const tooMany = Array.from({ length: 5 }, () => FIRST_POEM_ID);
    rpc.mockResolvedValue({ data: { poem_ids: tooMany, author_ids: [] }, error: null, status: HTTP_OK });

    await expect(getHomeFeaturedIds()).resolves.toEqual({ ok: false });
  });

  // implements FR-7 of home-page-sections
  it("answers a failure instead of throwing when the call itself throws", async () => {
    rpc.mockRejectedValue(new TypeError("fetch failed"));

    await expect(getHomeFeaturedIds()).resolves.toEqual({ ok: false });

    expect(loggedLine()).toBe("[home] read featured ids failed: unavailable");
  });
});

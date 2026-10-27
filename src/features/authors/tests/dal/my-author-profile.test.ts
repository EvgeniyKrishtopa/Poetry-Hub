// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { getMyAuthorProfile } from "../../dal/my-author-profile";
import { OWNER_PROFILE_COLUMNS } from "../../model/author.constants";

import { createFakeSupabase, errorResponse, okResponse, PUBLIC_URL_BASE, type FakeSupabase } from "./fake-supabase";

vi.mock("@/shared/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));

const PROFILE_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const PHOTO_PATH = `${PROFILE_ID}/0b7c1d2e-3f40-4a5b-8c6d-7e8f9a0b1c2d.png`;

const ROW = {
  id: PROFILE_ID,
  first_name: "Анна",
  last_name: "Ахматова",
  about: "## Поэт",
  photo_path: PHOTO_PATH,
};

const EMPTY_ROW = { ...ROW, first_name: null, last_name: null, about: null, photo_path: null };

let supabase: FakeSupabase;

describe("getMyAuthorProfile", () => {
  beforeEach(() => {
    supabase = createFakeSupabase();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase.client);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // implements FR-1, FR-2, FR-15 of add-author-profiles
  it("returns the owner's row, read by the id the database resolves, as a profile", async () => {
    supabase.onRpc("my_author_profile_id", okResponse(PROFILE_ID));
    supabase.queueQuery(okResponse(ROW));

    await expect(getMyAuthorProfile()).resolves.toEqual({
      ok: true,
      profile: {
        id: PROFILE_ID,
        firstName: "Анна",
        lastName: "Ахматова",
        about: "## Поэт",
        photoUrl: `${PUBLIC_URL_BASE}/${PHOTO_PATH}`,
      },
    });
    expect(supabase.queries[0]).toEqual([
      ["from", ["author_profiles"]],
      ["select", [OWNER_PROFILE_COLUMNS]],
      ["eq", ["id", PROFILE_ID]],
      ["single", []],
    ]);
  });

  it("selects the explicit column list, never * and never user_id", () => {
    expect(OWNER_PROFILE_COLUMNS).not.toContain("*");
    expect(OWNER_PROFILE_COLUMNS).not.toContain("user_id");
  });

  it("returns no profile without a row query when the caller has no row", async () => {
    supabase.onRpc("my_author_profile_id", okResponse(null));

    await expect(getMyAuthorProfile()).resolves.toEqual({ ok: true, profile: null });
    expect(supabase.queries).toHaveLength(0);
  });

  it("returns no profile for a row with every content field empty", async () => {
    supabase.onRpc("my_author_profile_id", okResponse(PROFILE_ID));
    supabase.queueQuery(okResponse(EMPTY_ROW));

    await expect(getMyAuthorProfile()).resolves.toEqual({ ok: true, profile: null });
  });

  it("returns a profile with no photo URL when no photo is stored", async () => {
    supabase.onRpc("my_author_profile_id", okResponse(PROFILE_ID));
    supabase.queueQuery(okResponse({ ...ROW, photo_path: null }));

    const result = await getMyAuthorProfile();

    expect(result).toMatchObject({ ok: true, profile: { photoUrl: null } });
  });

  // implements FR-9, NFR-3 of add-author-profiles
  it.each([
    ["an expired JWT (PGRST303)", "PGRST303", 401, "unauthenticated"],
    ["HTTP 401 with no code", "", 401, "unauthenticated"],
    ["a 5xx", "", 503, "unavailable"],
    ["a network failure (status 0)", "", 0, "unavailable"],
    ["permission denied (42501)", "42501", 403, "unknown"],
  ])("classifies a row read failing with %s by the response status", async (_case, code, status, failure) => {
    supabase.onRpc("my_author_profile_id", okResponse(PROFILE_ID));
    supabase.queueQuery(errorResponse(code, status));

    await expect(getMyAuthorProfile()).resolves.toEqual({ ok: false, failure });
  });

  it("classifies a failing id function by the response status", async () => {
    supabase.onRpc("my_author_profile_id", errorResponse("", 503));

    await expect(getMyAuthorProfile()).resolves.toEqual({ ok: false, failure: "unavailable" });
    expect(supabase.queries).toHaveLength(0);
  });

  it("logs a failure by its code only, never the error's message", async () => {
    supabase.onRpc("my_author_profile_id", okResponse(PROFILE_ID));
    supabase.queueQuery(errorResponse("42501", 403));

    await getMyAuthorProfile();

    expect(console.error).toHaveBeenCalledWith("[authors] read own profile failed: PostgrestError 42501");
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("Anna");
  });

  it("returns unavailable without logging when the config is invalid", async () => {
    vi.mocked(createSupabaseServerClient).mockRejectedValue(new SupabaseConfigError(["NEXT_PUBLIC_SUPABASE_URL"]));

    await expect(getMyAuthorProfile()).resolves.toEqual({ ok: false, failure: "unavailable" });
    expect(console.error).not.toHaveBeenCalled();
  });

  it("returns unknown, logged by name, for a malformed row", async () => {
    supabase.onRpc("my_author_profile_id", okResponse(PROFILE_ID));
    supabase.queueQuery(okResponse({ ...ROW, about: 42 }));

    await expect(getMyAuthorProfile()).resolves.toEqual({ ok: false, failure: "unknown" });
    expect(console.error).toHaveBeenCalledWith("[authors] read own profile failed: ZodError");
  });

  it("returns unknown for an id function result that is not a UUID", async () => {
    supabase.onRpc("my_author_profile_id", okResponse(42));

    await expect(getMyAuthorProfile()).resolves.toEqual({ ok: false, failure: "unknown" });
  });

  it("returns a failure instead of throwing when the client throws", async () => {
    supabase.rpc.mockRejectedValue(new TypeError("fetch failed"));

    await expect(getMyAuthorProfile()).resolves.toEqual({ ok: false, failure: "unavailable" });
    expect(console.error).toHaveBeenCalledWith("[authors] read own profile failed: TypeError");
  });
});

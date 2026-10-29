// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { getMyAuthorProfile } from "../../dal/my-author-profile";
import { getOwnPublicAuthor } from "../../dal/own-public-author";
import type { AuthorProfile, MyProfileResult, ProfileFailure } from "../../model/author.types";

import { createFakeSupabase, okResponse } from "./fake-supabase";

vi.mock("@/shared/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));

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

// The real memoized profile read, spied so a test can replace one result or count the reads.
vi.mock("../../dal/my-author-profile", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../dal/my-author-profile")>();
  return { getMyAuthorProfile: vi.fn(original.getMyAuthorProfile) };
});

const PROFILE_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";

const PUBLIC_PROFILE: AuthorProfile = {
  id: PROFILE_ID,
  firstName: "Анна",
  lastName: "Ахматова",
  about: null,
  photoUrl: null,
};

function profileResult(profile: AuthorProfile | null): MyProfileResult {
  return { ok: true, profile };
}

describe("getOwnPublicAuthor", () => {
  beforeEach(() => {
    for (const store of memoStores) store.clear();
    vi.mocked(getMyAuthorProfile).mockClear();
  });

  // implements FR-1 of add-poem-creation
  it("is public with the profile id when both names are set", async () => {
    vi.mocked(getMyAuthorProfile).mockResolvedValueOnce(profileResult(PUBLIC_PROFILE));

    await expect(getOwnPublicAuthor()).resolves.toEqual({ ok: true, status: "public", authorId: PROFILE_ID });
  });

  // implements FR-1 of add-poem-creation
  it.each([
    ["no profile row", null],
    ["no last name", { ...PUBLIC_PROFILE, lastName: null }],
    ["no first name", { ...PUBLIC_PROFILE, firstName: null }],
  ])("is not public with %s", async (_case, profile) => {
    vi.mocked(getMyAuthorProfile).mockResolvedValueOnce(profileResult(profile));

    await expect(getOwnPublicAuthor()).resolves.toEqual({ ok: true, status: "not-public" });
  });

  // implements FR-1 of add-poem-creation
  it.each(["unauthenticated", "unavailable", "unknown"] as const)(
    "passes the %s failure through",
    async (failure: ProfileFailure) => {
      vi.mocked(getMyAuthorProfile).mockResolvedValueOnce({ ok: false, failure });

      await expect(getOwnPublicAuthor()).resolves.toEqual({ ok: false, failure });
    },
  );

  // implements FR-1 of add-poem-creation
  it("reads the session and the profile once for two calls in one request, shared with getMyAuthorProfile", async () => {
    const supabase = createFakeSupabase();
    vi.mocked(createSupabaseServerClient).mockResolvedValue(supabase.client);
    supabase.onRpc("my_author_profile_id", okResponse(PROFILE_ID));
    supabase.queueQuery(
      okResponse({ id: PROFILE_ID, first_name: "Анна", last_name: "Ахматова", about: null, photo_path: null }),
    );

    const [first, second] = await Promise.all([getOwnPublicAuthor(), getOwnPublicAuthor()]);
    const direct = await getMyAuthorProfile();

    expect(first).toEqual({ ok: true, status: "public", authorId: PROFILE_ID });
    expect(second).toBe(first);
    expect(direct).toEqual(profileResult(PUBLIC_PROFILE));
    expect(createSupabaseServerClient).toHaveBeenCalledOnce();
    expect(supabase.queries).toHaveLength(1);
  });
});

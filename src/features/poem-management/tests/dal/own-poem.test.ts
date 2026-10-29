// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getOwnPublicAuthor } from "@/features/authors";
import { getAuthorPoem, type Poem } from "@/features/poems";

import { getOwnPoem, getOwnPoemTitle } from "../../dal/own-poem";

vi.mock("@/features/authors", () => ({ getOwnPublicAuthor: vi.fn() }));
vi.mock("@/features/poems", () => ({ getAuthorPoem: vi.fn() }));

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
const POEM_ID = "30000000-0000-4000-8000-000000000021";

const POEM: Poem = {
  id: POEM_ID,
  title: "Осенний сад",
  text: "строка",
  illustrationUrl: null,
  publishedAt: "2026-10-01",
  genreId: null,
};

describe("getOwnPoem and getOwnPoemTitle", () => {
  beforeEach(() => {
    for (const store of memoStores) store.clear();
    vi.mocked(getOwnPublicAuthor).mockReset().mockResolvedValue({ ok: true, status: "public", authorId: AUTHOR_ID });
    vi.mocked(getAuthorPoem).mockReset().mockResolvedValue({ ok: true, poem: POEM });
  });

  // implements FR-7 of add-poem-creation
  it("returns the own poem, read from the own author's list", async () => {
    await expect(getOwnPoem(POEM_ID)).resolves.toEqual({ ok: true, poem: POEM });
    expect(getAuthorPoem).toHaveBeenCalledExactlyOnceWith(AUTHOR_ID, POEM_ID);
  });

  // implements FR-7 of add-poem-creation
  it("is not-found for another author's poem or a malformed id", async () => {
    vi.mocked(getAuthorPoem).mockResolvedValue({ ok: false, reason: "not-found" });

    await expect(getOwnPoem("not-a-uuid")).resolves.toEqual({ ok: false, reason: "not-found" });
    await expect(getOwnPoemTitle("not-a-uuid")).resolves.toEqual({ ok: false, reason: "not-found" });
  });

  // implements FR-7 of add-poem-creation
  it("is not-found without a poem read when the own profile isn't public", async () => {
    vi.mocked(getOwnPublicAuthor).mockResolvedValue({ ok: true, status: "not-public" });

    await expect(getOwnPoem(POEM_ID)).resolves.toEqual({ ok: false, reason: "not-found" });
    expect(getAuthorPoem).not.toHaveBeenCalled();
  });

  // implements FR-7, FR-8 of add-poem-creation
  it.each(["unauthenticated", "unavailable", "unknown"] as const)(
    "is unavailable when the own profile read fails with %s",
    async (failure) => {
      vi.mocked(getOwnPublicAuthor).mockResolvedValue({ ok: false, failure });

      await expect(getOwnPoem(POEM_ID)).resolves.toEqual({ ok: false, reason: "unavailable" });
      await expect(getOwnPoemTitle(POEM_ID)).resolves.toEqual({ ok: false, reason: "unavailable" });
      expect(getAuthorPoem).not.toHaveBeenCalled();
    },
  );

  // implements FR-7 of add-poem-creation
  it("is unavailable when the poem read fails", async () => {
    vi.mocked(getAuthorPoem).mockResolvedValue({ ok: false, reason: "unavailable" });

    await expect(getOwnPoem(POEM_ID)).resolves.toEqual({ ok: false, reason: "unavailable" });
  });

  // implements FR-8 of add-poem-creation
  it("gives the trail the poem's title", async () => {
    await expect(getOwnPoemTitle(POEM_ID)).resolves.toEqual({ ok: true, title: POEM.title });
  });

  // implements FR-8 of add-poem-creation
  it("reads once for the page and the trail in one request", async () => {
    const [page, title] = await Promise.all([getOwnPoem(POEM_ID), getOwnPoemTitle(POEM_ID)]);

    expect(page).toEqual({ ok: true, poem: POEM });
    expect(title).toEqual({ ok: true, title: POEM.title });
    expect(getOwnPublicAuthor).toHaveBeenCalledOnce();
    expect(getAuthorPoem).toHaveBeenCalledOnce();
  });
});

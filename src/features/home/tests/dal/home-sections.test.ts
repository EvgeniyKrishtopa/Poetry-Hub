// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listPublicAuthors, type PublicAuthor } from "@/features/authors";
import { listLatestPoems, listPoemsByIds, type PoemSummary } from "@/features/poems";

import { getHomeFeaturedIds } from "../../dal/home-featured";
import { getFeaturedAuthors, getFeaturedWorks, getLatestWorks } from "../../dal/home-sections";
import { LATEST_LIMIT } from "../../model/home.constants";

vi.mock("@/features/authors", () => ({
  listPublicAuthors: vi.fn(),
  authorPagePath: (id: string) => `/authors/${id}`,
  fullName: ({ firstName, lastName }: { firstName: string; lastName: string }) => `${firstName} ${lastName}`,
}));
vi.mock("@/features/poems", () => ({
  listPoemsByIds: vi.fn(),
  listLatestPoems: vi.fn(),
  authorPoemPath: (authorId: string, poemId: string) => `/authors/${authorId}/poems/${poemId}`,
}));
vi.mock("../../dal/home-featured", () => ({ getHomeFeaturedIds: vi.fn() }));

const ANNA_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const BORIS_ID = "1679091c-5a88-4faf-b5e5-1c2b3a4d5e6f";
const GONE_AUTHOR_ID = "c4ca4238-a0b9-4382-8dcc-509a6f75849b";
const FIRST_POEM_ID = "30000000-0000-4000-8000-000000000052";
const SECOND_POEM_ID = "c3a1b2d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const THIRD_POEM_ID = "e4da3b7f-bbce-4345-9d7a-2c1f0b9a8d77";
const COVER_URL = "http://127.0.0.1:54321/storage/v1/object/public/poem-illustrations/cover.jpg";
const PHOTO_URL = "http://127.0.0.1:54321/storage/v1/object/public/author-photos/anna.jpg";

const ANNA: PublicAuthor = {
  id: ANNA_ID,
  firstName: "Анна",
  lastName: "Волкова",
  about: "Пишу о **море**.",
  photoUrl: PHOTO_URL,
};
const BORIS: PublicAuthor = { id: BORIS_ID, firstName: "Борис", lastName: "Север", about: null, photoUrl: null };

function poem(id: string, authorId: string, title: string, illustrationUrl: string | null = null): PoemSummary {
  return { id, authorId, title, illustrationUrl, createdAt: "2026-11-01T10:00:00+00:00" };
}

const FIRST_POEM = poem(FIRST_POEM_ID, ANNA_ID, "Ночной вокзал", COVER_URL);
const SECOND_POEM = poem(SECOND_POEM_ID, BORIS_ID, "Осенний сад");
const THIRD_POEM = poem(THIRD_POEM_ID, GONE_AUTHOR_ID, "Забытое");

const FAILED = { ok: false } as const;
const UNAVAILABLE = { ok: false, reason: "unavailable" } as const;

function idsAre(poemIds: string[], authorIds: string[]) {
  vi.mocked(getHomeFeaturedIds).mockResolvedValue({ ok: true, ids: { poemIds, authorIds } });
}

function authorsAre(...authors: PublicAuthor[]) {
  vi.mocked(listPublicAuthors).mockResolvedValue({ ok: true, authors });
}

function poemsByIdsAre(...poems: PoemSummary[]) {
  vi.mocked(listPoemsByIds).mockResolvedValue({ ok: true, poems });
}

function latestPoemsAre(...poems: PoemSummary[]) {
  vi.mocked(listLatestPoems).mockResolvedValue({ ok: true, poems });
}

describe("home sections DAL", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("getFeaturedWorks", () => {
    // implements FR-2 of home-page-sections
    it("composes a card per chosen poem, in the chosen order, with the author's name and the poem's link and cover", async () => {
      idsAre([FIRST_POEM_ID, SECOND_POEM_ID], []);
      authorsAre(ANNA, BORIS);
      poemsByIdsAre(FIRST_POEM, SECOND_POEM);

      const result = await getFeaturedWorks();

      expect(listPoemsByIds).toHaveBeenCalledExactlyOnceWith([FIRST_POEM_ID, SECOND_POEM_ID]);
      expect(result).toEqual({
        ok: true,
        items: [
          {
            id: FIRST_POEM_ID,
            title: "Ночной вокзал",
            authorName: "Анна Волкова",
            href: `/authors/${ANNA_ID}/poems/${FIRST_POEM_ID}`,
            coverUrl: COVER_URL,
          },
          {
            id: SECOND_POEM_ID,
            title: "Осенний сад",
            authorName: "Борис Север",
            href: `/authors/${BORIS_ID}/poems/${SECOND_POEM_ID}`,
            coverUrl: null,
          },
        ],
      });
    });

    // implements FR-2 of home-page-sections
    it("answers an empty section when nothing is chosen", async () => {
      idsAre([], []);
      authorsAre(ANNA);
      poemsByIdsAre();

      await expect(getFeaturedWorks()).resolves.toEqual({ ok: true, items: [] });
    });

    // implements FR-2, FR-11 of home-page-sections
    it("drops a card whose author is missing from the public author list", async () => {
      idsAre([THIRD_POEM_ID, FIRST_POEM_ID], []);
      authorsAre(ANNA);
      poemsByIdsAre(THIRD_POEM, FIRST_POEM);

      const result = await getFeaturedWorks();

      expect(result.ok && result.items.map((item) => item.id)).toEqual([FIRST_POEM_ID]);
    });

    // implements FR-7 of home-page-sections
    it("fails alone when the poems read is down", async () => {
      idsAre([FIRST_POEM_ID], [ANNA_ID]);
      authorsAre(ANNA);
      vi.mocked(listPoemsByIds).mockResolvedValue(UNAVAILABLE);

      await expect(getFeaturedWorks()).resolves.toEqual(FAILED);
    });

    // implements FR-7 of home-page-sections
    it("fails when the chosen ids cannot be read, without asking for poems", async () => {
      vi.mocked(getHomeFeaturedIds).mockResolvedValue(FAILED);
      authorsAre(ANNA);

      await expect(getFeaturedWorks()).resolves.toEqual(FAILED);

      expect(listPoemsByIds).not.toHaveBeenCalled();
    });

    // implements FR-7 of home-page-sections
    it("fails when the author list is down, without asking for poems", async () => {
      idsAre([FIRST_POEM_ID], []);
      vi.mocked(listPublicAuthors).mockResolvedValue(UNAVAILABLE);

      await expect(getFeaturedWorks()).resolves.toEqual(FAILED);

      expect(listPoemsByIds).not.toHaveBeenCalled();
    });
  });

  describe("getFeaturedAuthors", () => {
    // implements FR-4 of home-page-sections
    it("composes a card per chosen author, in the chosen order, with a plain description", async () => {
      idsAre([], [BORIS_ID, ANNA_ID]);
      authorsAre(ANNA, BORIS);

      const result = await getFeaturedAuthors();

      expect(result).toEqual({
        ok: true,
        items: [
          { id: BORIS_ID, name: "Борис Север", href: `/authors/${BORIS_ID}`, photoUrl: null, description: null },
          {
            id: ANNA_ID,
            name: "Анна Волкова",
            href: `/authors/${ANNA_ID}`,
            photoUrl: PHOTO_URL,
            description: "Пишу о море.",
          },
        ],
      });
    });

    // implements FR-4 of home-page-sections
    it("skips a chosen author who is not in the public author list", async () => {
      idsAre([], [GONE_AUTHOR_ID, ANNA_ID]);
      authorsAre(ANNA, BORIS);

      const result = await getFeaturedAuthors();

      expect(result.ok && result.items.map((item) => item.id)).toEqual([ANNA_ID]);
    });

    // implements FR-4 of home-page-sections
    it("answers an empty section when no author is chosen", async () => {
      idsAre([FIRST_POEM_ID], []);
      authorsAre(ANNA);

      await expect(getFeaturedAuthors()).resolves.toEqual({ ok: true, items: [] });
    });

    // implements FR-7 of home-page-sections
    it("fails when the author list is down", async () => {
      idsAre([], [ANNA_ID]);
      vi.mocked(listPublicAuthors).mockResolvedValue(UNAVAILABLE);

      await expect(getFeaturedAuthors()).resolves.toEqual(FAILED);
    });

    // implements FR-7 of home-page-sections
    it("is unaffected by a poems read that is down", async () => {
      idsAre([FIRST_POEM_ID], [ANNA_ID]);
      authorsAre(ANNA);
      vi.mocked(listPoemsByIds).mockResolvedValue(UNAVAILABLE);

      const result = await getFeaturedAuthors();

      expect(result.ok && result.items.map((item) => item.id)).toEqual([ANNA_ID]);
    });
  });

  describe("getLatestWorks", () => {
    // implements FR-5 of home-page-sections
    it("asks for the latest poems up to the limit and keeps their order, with each author's name and link", async () => {
      authorsAre(ANNA, BORIS);
      latestPoemsAre(SECOND_POEM, FIRST_POEM);

      const result = await getLatestWorks();

      expect(listLatestPoems).toHaveBeenCalledExactlyOnceWith(LATEST_LIMIT);
      expect(result).toEqual({
        ok: true,
        items: [
          {
            id: SECOND_POEM_ID,
            title: "Осенний сад",
            authorName: "Борис Север",
            href: `/authors/${BORIS_ID}/poems/${SECOND_POEM_ID}`,
          },
          {
            id: FIRST_POEM_ID,
            title: "Ночной вокзал",
            authorName: "Анна Волкова",
            href: `/authors/${ANNA_ID}/poems/${FIRST_POEM_ID}`,
          },
        ],
      });
    });

    // implements FR-5 of home-page-sections
    it("drops a poem whose author is missing from the public author list", async () => {
      authorsAre(ANNA);
      latestPoemsAre(THIRD_POEM, FIRST_POEM);

      const result = await getLatestWorks();

      expect(result.ok && result.items.map((item) => item.id)).toEqual([FIRST_POEM_ID]);
    });

    // implements FR-5 of home-page-sections
    it("answers an empty section when there is no poem", async () => {
      authorsAre(ANNA);
      latestPoemsAre();

      await expect(getLatestWorks()).resolves.toEqual({ ok: true, items: [] });
    });

    // implements FR-7 of home-page-sections
    it("fails alone when the latest read is down", async () => {
      authorsAre(ANNA);
      vi.mocked(listLatestPoems).mockResolvedValue(UNAVAILABLE);

      await expect(getLatestWorks()).resolves.toEqual(FAILED);
    });
  });

  // implements FR-7 of home-page-sections
  it("fails all three sections together when the author list is down", async () => {
    idsAre([FIRST_POEM_ID], [ANNA_ID]);
    poemsByIdsAre(FIRST_POEM);
    latestPoemsAre(FIRST_POEM);
    vi.mocked(listPublicAuthors).mockResolvedValue(UNAVAILABLE);

    const results = await Promise.all([getFeaturedWorks(), getFeaturedAuthors(), getLatestWorks()]);

    expect(results).toEqual([FAILED, FAILED, FAILED]);
  });

  // implements FR-7 of home-page-sections
  it("leaves the other sections alone when one poem read is down", async () => {
    idsAre([FIRST_POEM_ID], [ANNA_ID]);
    authorsAre(ANNA);
    vi.mocked(listPoemsByIds).mockResolvedValue(UNAVAILABLE);
    latestPoemsAre(FIRST_POEM);

    const [featuredWorks, featuredAuthors, latestWorks] = await Promise.all([
      getFeaturedWorks(),
      getFeaturedAuthors(),
      getLatestWorks(),
    ]);

    expect(featuredWorks).toEqual(FAILED);
    expect(featuredAuthors.ok && featuredAuthors.items).toHaveLength(1);
    expect(latestWorks.ok && latestWorks.items).toHaveLength(1);
  });
});

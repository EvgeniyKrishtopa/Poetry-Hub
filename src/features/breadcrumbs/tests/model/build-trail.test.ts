import { describe, expect, it } from "vitest";

import { AUTHORS_PATH } from "@/features/authors";
import type { AuthorPoemResult } from "@/features/poems";
import { ACCOUNT_PATH, POEM_MANAGEMENT_PATH } from "@/shared/config/account-paths";
import { HOME_PATH } from "@/shared/config/constants";

import { buildTrail } from "../../model/build-trail";
import { matchRoute } from "../../model/match-route";

const ANNA_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const AUTHOR_MATCH = { kind: "author", id: ANNA_ID } as const;

const HOME = { kind: "link", label: "Главная", href: HOME_PATH } as const;
const AUTHORS = { kind: "link", label: "Наши авторы", href: AUTHORS_PATH } as const;

describe("buildTrail", () => {
  // implements FR-1, FR-6 of add-breadcrumbs
  it("shows no trail for a route with no match", () => {
    expect(buildTrail({ kind: "none" })).toEqual({ kind: "none" });
  });

  // implements FR-2, FR-3 of add-breadcrumbs
  it("prepends «Главная» as a link home to a static match, keeping the last item current", () => {
    const match = {
      kind: "static",
      items: [
        { kind: "link", label: "Мастерская поэта", href: ACCOUNT_PATH },
        { kind: "current", label: "Профиль автора" },
      ],
    } as const;

    expect(buildTrail(match)).toEqual({ kind: "shown", items: [HOME, ...match.items] });
  });

  // implements FR-3, FR-4 of add-breadcrumbs
  it("ends an author trail with the author's name, after «Наши авторы» linking to the directory", () => {
    expect(buildTrail(AUTHOR_MATCH, { ok: true, name: "Анна Ахматова" })).toEqual({
      kind: "shown",
      items: [HOME, AUTHORS, { kind: "current", label: "Анна Ахматова" }],
    });
  });

  // implements FR-4 of add-breadcrumbs
  it("ends an author trail with «Автор» when the author read is unavailable", () => {
    expect(buildTrail(AUTHOR_MATCH, { ok: false, reason: "unavailable" })).toEqual({
      kind: "shown",
      items: [HOME, AUTHORS, { kind: "current", label: "Автор" }],
    });
  });

  // implements FR-4 of add-breadcrumbs
  it("falls back to «Автор» when an author match comes with no name result", () => {
    expect(buildTrail(AUTHOR_MATCH)).toEqual({
      kind: "shown",
      items: [HOME, AUTHORS, { kind: "current", label: "Автор" }],
    });
  });

  // implements FR-4 of add-about-page
  it("builds «Главная» › «О проекте» for the about page", () => {
    expect(buildTrail(matchRoute(["about"]))).toEqual({
      kind: "shown",
      items: [HOME, { kind: "current", label: "О проекте" }],
    });
  });

  // implements FR-4 of add-privacy-policy-page
  it("builds «Главная» › «Политика конфиденциальности» for the privacy page", () => {
    expect(buildTrail(matchRoute(["privacy"]))).toEqual({
      kind: "shown",
      items: [HOME, { kind: "current", label: "Политика конфиденциальности" }],
    });
  });

  // implements FR-4 of add-breadcrumbs
  it("shows no trail for an author that doesn't exist", () => {
    expect(buildTrail(AUTHOR_MATCH, { ok: false, reason: "not-found" })).toEqual({ kind: "none" });
  });
});

describe("buildTrail on the poem routes", () => {
  const POEM_ID = "30000000-0000-4000-8000-000000000021";
  const POEM_MATCH = { kind: "author-poem", authorId: ANNA_ID, poemId: POEM_ID } as const;

  const ANNA = { ok: true, name: "Анна Ахматова" } as const;
  const AUTHOR_UNAVAILABLE = { ok: false, reason: "unavailable" } as const;
  const AUTHOR_NOT_FOUND = { ok: false, reason: "not-found" } as const;
  const POEM_FOUND: AuthorPoemResult = {
    ok: true,
    poem: {
      id: POEM_ID,
      title: "Осенний сад",
      text: "Строка",
      illustrationUrl: null,
      publishedAt: "2026-03-12",
      genreId: null,
    },
  };
  const POEM_NOT_FOUND: AuthorPoemResult = { ok: false, reason: "not-found" };
  const POEM_UNAVAILABLE: AuthorPoemResult = { ok: false, reason: "unavailable" };

  const AUTHOR_HREF = `/authors/${ANNA_ID}`;

  // implements FR-7 of refine-author-page-and-contact
  it("ends the poem trail on the poem's title, right after the author's name linking to the author page", () => {
    expect(buildTrail(POEM_MATCH, ANNA, POEM_FOUND)).toEqual({
      kind: "shown",
      items: [
        HOME,
        AUTHORS,
        { kind: "link", label: "Анна Ахматова", href: AUTHOR_HREF },
        { kind: "current", label: "Осенний сад" },
      ],
    });
  });

  // implements FR-7 of refine-author-page-and-contact
  it("keeps «Автор» as a link to the author page when the author read is unavailable", () => {
    expect(buildTrail(POEM_MATCH, AUTHOR_UNAVAILABLE, POEM_FOUND)).toEqual({
      kind: "shown",
      items: [
        HOME,
        AUTHORS,
        { kind: "link", label: "Автор", href: AUTHOR_HREF },
        { kind: "current", label: "Осенний сад" },
      ],
    });
  });

  // implements FR-8 of add-author-poems
  it("shows no trail for an author that doesn't exist", () => {
    expect(buildTrail(POEM_MATCH, AUTHOR_NOT_FOUND, POEM_FOUND)).toEqual({ kind: "none" });
    expect(buildTrail(POEM_MATCH, AUTHOR_NOT_FOUND, POEM_NOT_FOUND)).toEqual({ kind: "none" });
  });

  // implements FR-8 of add-author-poems
  it("shows no trail for a poem that isn't the author's", () => {
    expect(buildTrail(POEM_MATCH, ANNA, POEM_NOT_FOUND)).toEqual({ kind: "none" });
  });

  // implements FR-8, FR-12 of add-author-poems
  it("ends on «Автор» as the current item when the author is unavailable and the poem isn't found", () => {
    expect(buildTrail(POEM_MATCH, AUTHOR_UNAVAILABLE, POEM_NOT_FOUND)).toEqual({
      kind: "shown",
      items: [HOME, AUTHORS, { kind: "current", label: "Автор" }],
    });
  });

  // breadcrumbs FR-4 (add-poem-creation): the poem page shows the error screen, so the trail ends at the author.
  it("ends on the author's name as the current item when the poem read is unavailable", () => {
    expect(buildTrail(POEM_MATCH, ANNA, POEM_UNAVAILABLE)).toEqual({
      kind: "shown",
      items: [HOME, AUTHORS, { kind: "current", label: "Анна Ахматова" }],
    });
  });

  it("ends on «Автор» as the current item when both the author and the poem reads are unavailable", () => {
    expect(buildTrail(POEM_MATCH, AUTHOR_UNAVAILABLE, POEM_UNAVAILABLE)).toEqual({
      kind: "shown",
      items: [HOME, AUTHORS, { kind: "current", label: "Автор" }],
    });
  });

  it("shows no trail for an unknown author even when the poem read is unavailable", () => {
    expect(buildTrail(POEM_MATCH, AUTHOR_NOT_FOUND, POEM_UNAVAILABLE)).toEqual({ kind: "none" });
  });

  // implements FR-8 of add-author-poems
  it("shows no trail for a poem match that comes with no poem result", () => {
    expect(buildTrail(POEM_MATCH, ANNA)).toEqual({ kind: "none" });
  });
});

describe("buildTrail on the poem management routes", () => {
  const POEM_ID = "30000000-0000-4000-8000-000000000021";
  const OWN_POEM_MATCH = { kind: "own-poem", poemId: POEM_ID } as const;

  const ACCOUNT_LINK = { kind: "link", label: "Мастерская поэта", href: ACCOUNT_PATH } as const;
  const MANAGEMENT_LINK = { kind: "link", label: "Управление произведениями", href: POEM_MANAGEMENT_PATH } as const;

  // implements FR-8 of add-poem-creation
  it("builds the list and add form trails from their static matches", () => {
    expect(buildTrail(matchRoute(["account", "poems"]))).toEqual({
      kind: "shown",
      items: [HOME, ACCOUNT_LINK, { kind: "current", label: "Управление произведениями" }],
    });
    expect(buildTrail(matchRoute(["account", "poems", "new"]))).toEqual({
      kind: "shown",
      items: [HOME, ACCOUNT_LINK, MANAGEMENT_LINK, { kind: "current", label: "Добавление нового произведения" }],
    });
  });

  // implements FR-8 of add-poem-creation
  it("ends the owner's poem trail on the poem's title, after the management item linking to the list", () => {
    expect(buildTrail(OWN_POEM_MATCH, undefined, undefined, { ok: true, title: "Первый снег" })).toEqual({
      kind: "shown",
      items: [HOME, ACCOUNT_LINK, MANAGEMENT_LINK, { kind: "current", label: "Первый снег" }],
    });
  });

  // implements FR-8 of add-poem-creation
  it("shows no trail for a poem that isn't the owner's", () => {
    expect(buildTrail(OWN_POEM_MATCH, undefined, undefined, { ok: false, reason: "not-found" })).toEqual({
      kind: "none",
    });
  });

  // implements FR-8 of add-poem-creation
  it("ends on «Управление произведениями» as the current item when the poem read is unavailable", () => {
    expect(buildTrail(OWN_POEM_MATCH, undefined, undefined, { ok: false, reason: "unavailable" })).toEqual({
      kind: "shown",
      items: [HOME, ACCOUNT_LINK, { kind: "current", label: "Управление произведениями" }],
    });
  });

  it("shows no trail for an owner's poem match that comes with no title result", () => {
    expect(buildTrail(OWN_POEM_MATCH)).toEqual({ kind: "none" });
  });
});

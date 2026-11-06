import { describe, expect, it } from "vitest";

import { AUTHOR_EDITOR_PATH, AUTHORS_PATH } from "@/features/authors";
import { NEW_COLLECTION_PATH } from "@/features/collection-management";
import { NEW_POEM_PATH } from "@/features/poem-management";
import { ACCOUNT_PATH, POEM_MANAGEMENT_PATH, SIGN_IN_PATH, SIGN_UP_PATH } from "@/shared/config/account-paths";
import { ABOUT_PATH, PRIVACY_PATH } from "@/shared/config/constants";

import { matchRoute, STATIC_ROUTES } from "../../model/match-route";

const ANNA_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";

describe("matchRoute", () => {
  // implements FR-1 of add-breadcrumbs
  it("matches nothing on home", () => {
    expect(matchRoute([])).toEqual({ kind: "none" });
  });

  // implements FR-2, NFR-6 of add-breadcrumbs
  it.each([
    [["authors"], [{ kind: "current", label: "Наши авторы" }]],
    [["account"], [{ kind: "current", label: "Мастерская поэта" }]],
    [
      ["account", "author"],
      [
        { kind: "link", label: "Мастерская поэта", href: ACCOUNT_PATH },
        { kind: "current", label: "Профиль автора" },
      ],
    ],
    [["login"], [{ kind: "current", label: "Вход" }]],
    [["signup"], [{ kind: "current", label: "Регистрация" }]],
  ])("maps %j to its items without «Главная», parents as links and the last as current", (segments, items) => {
    expect(matchRoute(segments)).toEqual({ kind: "static", items });
  });

  // implements FR-4 of add-breadcrumbs
  it("matches an author page by its id", () => {
    expect(matchRoute(["authors", ANNA_ID])).toEqual({ kind: "author", id: ANNA_ID });
  });

  // implements FR-6 of refine-author-page-and-contact
  it("matches nothing for the removed poem list route, so it gets no trail", () => {
    expect(matchRoute(["authors", ANNA_ID, "poems"])).toEqual({ kind: "none" });
  });

  // implements FR-8 of add-author-poems
  it("matches one poem by the author id and the poem id", () => {
    expect(matchRoute(["authors", ANNA_ID, "poems", "osenniy-sad"])).toEqual({
      kind: "author-poem",
      authorId: ANNA_ID,
      poemId: "osenniy-sad",
    });
  });

  // implements FR-6 of add-breadcrumbs, FR-8 of add-author-poems
  it.each([
    [["no-such-page"]],
    [["account", "author", "extra"]],
    [["authors", "a", "b"]],
    [["authors", ""]],
    [["authors", ANNA_ID, ""]],
    [["authors", ANNA_ID, "poems", ""]],
    [["authors", ANNA_ID, "poems", "x", "y"]],
  ])("matches nothing for %j", (segments) => {
    expect(matchRoute(segments)).toEqual({ kind: "none" });
  });

  // implements FR-2 of add-breadcrumbs
  it("writes every row's path from its named constant", () => {
    expect(STATIC_ROUTES.map((route) => route.path)).toEqual([
      AUTHORS_PATH,
      ACCOUNT_PATH,
      AUTHOR_EDITOR_PATH,
      POEM_MANAGEMENT_PATH,
      NEW_POEM_PATH,
      NEW_COLLECTION_PATH,
      SIGN_IN_PATH,
      SIGN_UP_PATH,
      ABOUT_PATH,
      PRIVACY_PATH,
    ]);
  });

  // implements FR-8 of add-poem-creation
  it("maps the management list to «Управление произведениями» under «Мастерская поэта»", () => {
    expect(matchRoute(["account", "poems"])).toEqual({
      kind: "static",
      items: [
        { kind: "link", label: "Мастерская поэта", href: ACCOUNT_PATH },
        { kind: "current", label: "Управление произведениями" },
      ],
    });
  });

  // implements FR-8 of add-poem-creation
  it("maps the add form to «Добавление нового произведения» under both management parents", () => {
    expect(matchRoute(["account", "poems", "new"])).toEqual({
      kind: "static",
      items: [
        { kind: "link", label: "Мастерская поэта", href: ACCOUNT_PATH },
        { kind: "link", label: "Управление произведениями", href: POEM_MANAGEMENT_PATH },
        { kind: "current", label: "Добавление нового произведения" },
      ],
    });
  });

  // implements FR-17 of add-poem-collections
  it("maps the create page to «Создание сборника» under both management parents", () => {
    expect(matchRoute(["account", "poems", "collections", "new"])).toEqual({
      kind: "static",
      items: [
        { kind: "link", label: "Мастерская поэта", href: ACCOUNT_PATH },
        { kind: "link", label: "Управление произведениями", href: POEM_MANAGEMENT_PATH },
        { kind: "current", label: "Создание сборника" },
      ],
    });
  });

  // implements FR-8 of add-poem-creation
  it("matches the owner's poem page by the poem id", () => {
    const poemId = "30000000-0000-4000-8000-000000000021";

    expect(matchRoute(["account", "poems", poemId])).toEqual({ kind: "own-poem", poemId });
  });

  // implements FR-15 of edit-poem
  it("matches the owner's edit page of one poem by the poem id", () => {
    const poemId = "30000000-0000-4000-8000-000000000021";

    expect(matchRoute(["account", "poems", poemId, "edit"])).toEqual({ kind: "own-poem-edit", poemId });
  });

  // implements FR-17 of add-poem-collections
  it("matches the owner's collection page and its edit page by the collection id", () => {
    const collectionId = "40000000-0000-4000-8000-000000000041";

    expect(matchRoute(["account", "poems", "collections", collectionId])).toEqual({
      kind: "own-collection",
      collectionId,
    });
    expect(matchRoute(["account", "poems", "collections", collectionId, "edit"])).toEqual({
      kind: "own-collection-edit",
      collectionId,
    });
  });

  // implements FR-17 of add-poem-collections
  it.each([
    [["account", "poems", "collections", ""]],
    [["account", "poems", "collections", "", "edit"]],
    [["account", "poems", "collections", "a", "b"]],
    [["account", "poems", "collections", "a", "edit", "b"]],
  ])("matches nothing for the collection path %j", (segments) => {
    expect(matchRoute(segments)).toEqual({ kind: "none" });
  });

  // implements FR-8 of add-poem-creation
  it.each([
    [["account", "poems", "a", "b"]],
    [["account", "poems", ""]],
    [["account", "poems", "", "edit"]],
    [["account", "poems", "a", "edit", "b"]],
  ])("matches nothing for %j", (segments) => {
    expect(matchRoute(segments)).toEqual({ kind: "none" });
  });

  // implements FR-4 of add-about-page
  it("maps the about page to «О проекте» as the current item", () => {
    expect(matchRoute(["about"])).toEqual({ kind: "static", items: [{ kind: "current", label: "О проекте" }] });
  });

  // implements FR-4 of add-privacy-policy-page
  it("maps the privacy page to «Политика конфиденциальности» as the current item", () => {
    expect(matchRoute(["privacy"])).toEqual({
      kind: "static",
      items: [{ kind: "current", label: "Политика конфиденциальности" }],
    });
  });
});

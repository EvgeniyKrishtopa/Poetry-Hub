import { describe, expect, it } from "vitest";

import { AUTHOR_EDITOR_PATH, AUTHORS_PATH } from "@/features/authors";
import { ACCOUNT_PATH, SIGN_IN_PATH, SIGN_UP_PATH } from "@/shared/config/account-paths";
import { ABOUT_PATH } from "@/shared/config/constants";

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

  // implements FR-6 of add-breadcrumbs
  it.each([[["no-such-page"]], [["account", "author", "extra"]], [["authors", "a", "b"]], [["authors", ""]]])(
    "matches nothing for %j",
    (segments) => {
      expect(matchRoute(segments)).toEqual({ kind: "none" });
    },
  );

  // implements FR-2 of add-breadcrumbs
  it("writes every row's path from its named constant", () => {
    expect(STATIC_ROUTES.map((route) => route.path)).toEqual([
      AUTHORS_PATH,
      ACCOUNT_PATH,
      AUTHOR_EDITOR_PATH,
      SIGN_IN_PATH,
      SIGN_UP_PATH,
      ABOUT_PATH,
    ]);
  });

  // implements FR-4 of add-about-page
  it("maps the about page to «О проекте» as the current item", () => {
    expect(matchRoute(["about"])).toEqual({ kind: "static", items: [{ kind: "current", label: "О проекте" }] });
  });
});

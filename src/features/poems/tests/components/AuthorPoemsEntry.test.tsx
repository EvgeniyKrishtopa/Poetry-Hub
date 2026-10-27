import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthorPoemsEntry } from "../../components/AuthorPoemsEntry/AuthorPoemsEntry";
import { listAuthorPoems } from "../../dal/author-poems";
import type { Poem } from "../../model/poem.types";

vi.mock("../../dal/author-poems", () => ({ listAuthorPoems: vi.fn() }));

const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";

const NIGHT_STATION: Poem = {
  id: "nochnoy-vokzal",
  title: "Ночной вокзал",
  text: "Табло мигает жёлтыми словами,",
  illustrationSrc: "/mock-poems/nochnoy-vokzal.svg",
  publishedAt: "2026-07-01",
  genre: "Сонет",
};

const AUTUMN_GARDEN: Poem = {
  id: "osenniy-sad",
  title: "Осенний сад",
  text: "Листва ложится на дорожки,",
  illustrationSrc: "/mock-poems/osenniy-sad.svg",
  publishedAt: "2026-03-12",
  genre: "Лирика",
};

async function renderEntry() {
  render(await AuthorPoemsEntry({ authorId: Promise.resolve(AUTHOR_ID) }));
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("AuthorPoemsEntry", () => {
  // implements FR-5, NFR-4 of refine-author-page-and-contact
  it("shows the h2 «Произведения» over the author's poem links, newest first, with no list-page link", async () => {
    // The DAL returns the poems newest first; the section keeps that order.
    vi.mocked(listAuthorPoems).mockResolvedValue([NIGHT_STATION, AUTUMN_GARDEN]);

    await renderEntry();

    expect(listAuthorPoems).toHaveBeenCalledWith(AUTHOR_ID);
    expect(screen.getByRole("heading", { level: 2, name: "Произведения" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    const links = within(screen.getByRole("list")).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["Ночной вокзал", "Осенний сад"]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      `/authors/${AUTHOR_ID}/poems/nochnoy-vokzal`,
      `/authors/${AUTHOR_ID}/poems/osenniy-sad`,
    ]);
    expect(screen.queryByRole("link", { name: "Произведения автора" })).toBeNull();
    expect(screen.queryByText("У автора пока ещё нет публикаций.")).toBeNull();
  });

  // implements FR-5, NFR-4 of refine-author-page-and-contact
  it("shows the heading and the empty text, and no list, when the author has no poems", async () => {
    vi.mocked(listAuthorPoems).mockResolvedValue([]);

    await renderEntry();

    expect(screen.getByRole("heading", { level: 2, name: "Произведения" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(screen.getByText("У автора пока ещё нет публикаций.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });
});

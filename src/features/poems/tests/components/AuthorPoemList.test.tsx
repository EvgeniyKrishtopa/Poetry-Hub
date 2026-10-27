import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AuthorPoemList } from "../../components/AuthorPoemList/AuthorPoemList";
import type { Poem } from "../../model/poem.types";

const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";

const NIGHT_STATION: Poem = {
  id: "nochnoy-vokzal",
  title: "Ночной вокзал",
  text: "Табло мигает жёлтыми словами,\nПоследний поезд медлит у перрона.",
  illustrationSrc: "/mock-poems/nochnoy-vokzal.svg",
  publishedAt: "2026-07-01",
  genre: "Сонет",
};

const AUTUMN_GARDEN: Poem = {
  id: "osenniy-sad",
  title: "Осенний сад",
  text: "Листва ложится на дорожки,\nШуршит под шагом тишина.",
  illustrationSrc: "/mock-poems/osenniy-sad.svg",
  publishedAt: "2026-03-12",
  genre: "Лирика",
};

describe("AuthorPoemList", () => {
  // implements FR-5, NFR-4 of refine-author-page-and-contact
  it("shows the h2 «Произведения» over title links, in the given order, with poem hrefs", () => {
    render(<AuthorPoemList authorId={AUTHOR_ID} poems={[NIGHT_STATION, AUTUMN_GARDEN]} />);

    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: "Произведения" })).toBeInTheDocument();
    for (const item of screen.getAllByRole("listitem")) expect(within(item).getAllByRole("link")).toHaveLength(1);
    const links = within(screen.getByRole("list")).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["Ночной вокзал", "Осенний сад"]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      `/authors/${AUTHOR_ID}/poems/nochnoy-vokzal`,
      `/authors/${AUTHOR_ID}/poems/osenniy-sad`,
    ]);
  });

  // implements FR-5 of refine-author-page-and-contact
  it("shows only the titles: no text, date, genre, or illustration", () => {
    const { container } = render(<AuthorPoemList authorId={AUTHOR_ID} poems={[NIGHT_STATION, AUTUMN_GARDEN]} />);

    expect(container).not.toHaveTextContent("Табло");
    expect(container).not.toHaveTextContent("Жанр");
    expect(container.querySelector("time")).toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
  });

  // implements FR-5, NFR-4 of refine-author-page-and-contact
  it("shows the heading and the empty text, and no list, when the author has no poems", () => {
    render(<AuthorPoemList authorId={AUTHOR_ID} poems={[]} />);

    expect(screen.getByRole("heading", { level: 2, name: "Произведения" })).toBeInTheDocument();
    expect(screen.getByText("У автора пока ещё нет публикаций.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).toBeNull();
  });
});

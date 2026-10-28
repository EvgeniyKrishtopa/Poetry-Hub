import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AuthorPoemList } from "../../components/AuthorPoemList/AuthorPoemList";
import { AUTUMN_GARDEN, FIXTURE_AUTHOR_ID, NIGHT_STATION } from "../poem-fixtures";

const AUTHOR_ID = FIXTURE_AUTHOR_ID;
const TWO_POEMS = { ok: true, poems: [NIGHT_STATION, AUTUMN_GARDEN] } as const;

describe("AuthorPoemList", () => {
  // implements FR-5, NFR-4 of refine-author-page-and-contact
  it("shows the h2 «Произведения» over title links, in the given order, with poem hrefs", () => {
    render(<AuthorPoemList authorId={AUTHOR_ID} result={TWO_POEMS} />);

    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(screen.getByRole("heading", { level: 2, name: "Произведения" })).toBeInTheDocument();
    for (const item of screen.getAllByRole("listitem")) expect(within(item).getAllByRole("link")).toHaveLength(1);
    const links = within(screen.getByRole("list")).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["Ночной вокзал", "Осенний сад"]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      `/authors/${AUTHOR_ID}/poems/${NIGHT_STATION.id}`,
      `/authors/${AUTHOR_ID}/poems/${AUTUMN_GARDEN.id}`,
    ]);
  });

  // implements FR-5 of refine-author-page-and-contact
  it("shows only the titles: no text, date, genre, or illustration", () => {
    const { container } = render(<AuthorPoemList authorId={AUTHOR_ID} result={TWO_POEMS} />);

    expect(container).not.toHaveTextContent("Табло");
    expect(container).not.toHaveTextContent("Жанр");
    expect(container.querySelector("time")).toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
  });

  // implements FR-5, NFR-4 of refine-author-page-and-contact
  it("shows the heading and the empty text, and no list, when the author has no poems", () => {
    render(<AuthorPoemList authorId={AUTHOR_ID} result={{ ok: true, poems: [] }} />);

    expect(screen.getByRole("heading", { level: 2, name: "Произведения" })).toBeInTheDocument();
    expect(screen.getByText("У автора пока ещё нет публикаций.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).toBeNull();
  });

  // implements FR-11 of add-poem-creation
  it("shows the heading and the unavailable text, and no list, when the poems can't be read", () => {
    render(<AuthorPoemList authorId={AUTHOR_ID} result={{ ok: false, reason: "unavailable" }} />);

    expect(screen.getByRole("heading", { level: 2, name: "Произведения" })).toBeInTheDocument();
    expect(screen.getByText("Произведения сейчас недоступны.")).toHaveClass("text-muted");
    expect(screen.queryByText("У автора пока ещё нет публикаций.")).toBeNull();
    expect(screen.queryByRole("list")).toBeNull();
  });
});

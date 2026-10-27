import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthorPoemsEntry } from "../../components/AuthorPoemsEntry/AuthorPoemsEntry";
import { listAuthorPoems } from "../../dal/author-poems";
import type { Poem } from "../../model/poem.types";

vi.mock("../../dal/author-poems", () => ({ listAuthorPoems: vi.fn() }));

const AUTHOR_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";

const POEM: Poem = {
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
  // implements FR-1 of add-author-poems
  it("links to the poem list when the author has poems, with no empty text", async () => {
    vi.mocked(listAuthorPoems).mockResolvedValue([POEM]);

    await renderEntry();

    expect(listAuthorPoems).toHaveBeenCalledWith(AUTHOR_ID);
    expect(screen.getByRole("link", { name: "Произведения автора" })).toHaveAttribute(
      "href",
      `/authors/${AUTHOR_ID}/poems`,
    );
    expect(screen.queryByText("У автора пока ещё нет публикаций.")).toBeNull();
  });

  // implements FR-1 of add-author-poems
  it("shows the empty text and no link when the author has no poems", async () => {
    vi.mocked(listAuthorPoems).mockResolvedValue([]);

    await renderEntry();

    expect(screen.getByText("У автора пока ещё нет публикаций.")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });
});

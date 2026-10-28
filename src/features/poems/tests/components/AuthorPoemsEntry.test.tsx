import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AuthorPoemsEntry } from "../../components/AuthorPoemsEntry/AuthorPoemsEntry";
import { listAuthorPoems } from "../../dal/author-poems";
import { AUTUMN_GARDEN, FIXTURE_AUTHOR_ID, NIGHT_STATION } from "../poem-fixtures";

vi.mock("../../dal/author-poems", () => ({ listAuthorPoems: vi.fn() }));

const AUTHOR_ID = FIXTURE_AUTHOR_ID;

async function renderEntry() {
  render(await AuthorPoemsEntry({ authorId: Promise.resolve(AUTHOR_ID) }));
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("AuthorPoemsEntry", () => {
  // implements FR-5, NFR-4 of refine-author-page-and-contact
  // implements FR-9 of add-poem-creation
  it("shows the h2 «Произведения» over the author's poem links, newest first, with no list-page link", async () => {
    // The DAL returns the poems newest first; the section keeps that order.
    vi.mocked(listAuthorPoems).mockResolvedValue({ ok: true, poems: [NIGHT_STATION, AUTUMN_GARDEN] });

    await renderEntry();

    expect(listAuthorPoems).toHaveBeenCalledWith(AUTHOR_ID);
    expect(screen.getByRole("heading", { level: 2, name: "Произведения" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    const links = within(screen.getByRole("list")).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["Ночной вокзал", "Осенний сад"]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      `/authors/${AUTHOR_ID}/poems/${NIGHT_STATION.id}`,
      `/authors/${AUTHOR_ID}/poems/${AUTUMN_GARDEN.id}`,
    ]);
    expect(screen.queryByRole("link", { name: "Произведения автора" })).toBeNull();
    expect(screen.queryByText("У автора пока ещё нет публикаций.")).toBeNull();
  });

  // implements FR-5, NFR-4 of refine-author-page-and-contact
  // implements FR-9 of add-poem-creation
  it("shows the heading and the empty text, and no list, when the author has no poems", async () => {
    vi.mocked(listAuthorPoems).mockResolvedValue({ ok: true, poems: [] });

    await renderEntry();

    expect(screen.getByRole("heading", { level: 2, name: "Произведения" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(screen.getByText("У автора пока ещё нет публикаций.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  // implements FR-11 of add-poem-creation
  it("shows the unavailable text in the section, and no list, when the poems can't be read", async () => {
    vi.mocked(listAuthorPoems).mockResolvedValue({ ok: false, reason: "unavailable" });

    await renderEntry();

    expect(screen.getByRole("heading", { level: 2, name: "Произведения" })).toBeInTheDocument();
    expect(screen.getByText("Произведения сейчас недоступны.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).toBeNull();
  });
});

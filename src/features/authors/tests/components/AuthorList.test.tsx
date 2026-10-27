import { render, screen, within } from "@testing-library/react";
import { Suspense, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { AuthorDirectory } from "../../components/AuthorDirectory/AuthorDirectory";
import { AuthorList } from "../../components/AuthorList/AuthorList";
import { AuthorListLoader } from "../../components/AuthorListLoader/AuthorListLoader";
import { listPublicAuthors } from "../../dal/public-authors";
import type { PublicAuthor, PublicAuthorsResult } from "../../model/author.types";

vi.mock("../../dal/public-authors", () => ({ listPublicAuthors: vi.fn() }));

const ANNA_ID = "8f14e45f-ceea-4e67-a1b2-3c4d5e6f7a8b";
const BORIS_ID = "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f";

function author(id: string, firstName: string, lastName: string): PublicAuthor {
  return { id, firstName, lastName, about: null, photoUrl: null };
}

const LISTED: PublicAuthorsResult = {
  ok: true,
  authors: [author(ANNA_ID, "Анна", "Ахматова"), author(BORIS_ID, "Борис", "Пастернак")],
};

describe("AuthorList", () => {
  // implements FR-13, NFR-8 of add-author-profiles
  it("shows the heading «Наши авторы» on a lang=ru root", () => {
    const { container } = render(<AuthorList result={LISTED} />);

    expect(screen.getByRole("heading", { level: 1, name: "Наши авторы" })).toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute("lang", "ru");
  });

  // implements FR-4, FR-5, FR-13 of add-author-profiles
  it("links each author by full name to /authors/<profile id>, in the order given", () => {
    render(<AuthorList result={LISTED} />);

    const links = within(screen.getByRole("list")).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["Анна Ахматова", "Борис Пастернак"]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([`/authors/${ANNA_ID}`, `/authors/${BORIS_ID}`]);
  });

  // implements FR-13 of add-author-profiles
  it("shows «Пока нет авторов.» for an empty directory", () => {
    render(<AuthorList result={{ ok: true, authors: [] }} />);

    expect(screen.getByText("Пока нет авторов.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).toBeNull();
  });

  // implements FR-13 of add-author-profiles
  it("shows «Список авторов сейчас недоступен.» as an alert when the read failed", () => {
    render(<AuthorList result={{ ok: false, reason: "unavailable" }} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Список авторов сейчас недоступен.");
    expect(screen.queryByRole("list")).toBeNull();
  });
});

interface SuspenseProps {
  fallback: ReactElement;
  children: ReactElement;
}

describe("AuthorDirectory", () => {
  // An async Server Component can't render in jsdom, so this checks the tree the wrapper returns.
  it("streams the list loader inside Suspense, with the heading and skeleton lines as the fallback", () => {
    const element = AuthorDirectory();
    expect(element.type).toBe(Suspense);
    const { fallback, children } = element.props as SuspenseProps;

    expect(children.type).toBe(AuthorListLoader);
    const { container } = render(fallback);
    expect(screen.getByRole("heading", { level: 1, name: "Наши авторы" })).toBeInTheDocument();
    expect(container.querySelectorAll("[data-skeleton]")).toHaveLength(5);
  });
});

describe("AuthorListLoader", () => {
  it("renders the list with the cached read's result", async () => {
    vi.mocked(listPublicAuthors).mockResolvedValue(LISTED);

    const element = await AuthorListLoader();

    expect(element.type).toBe(AuthorList);
    expect(element.props).toEqual({ result: LISTED });
  });
});

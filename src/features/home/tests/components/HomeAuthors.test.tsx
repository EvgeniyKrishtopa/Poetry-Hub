import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HomeAuthors } from "../../components/HomeAuthors/HomeAuthors";
import { SECTION_HEADINGS } from "../../model/home-messages";
import type { FeaturedAuthor } from "../../model/home-section.types";

const PHOTO_URL = "http://127.0.0.1:54321/storage/v1/object/public/author-photos/anna.jpg";

function author(index: number, overrides: Partial<FeaturedAuthor> = {}): FeaturedAuthor {
  return {
    id: `author-${index}`,
    name: `Автор ${index}`,
    href: `/authors/a${index}`,
    photoUrl: PHOTO_URL,
    description: `Описание ${index}`,
    ...overrides,
  };
}

function renderSection(items: readonly FeaturedAuthor[]) {
  return render(<HomeAuthors result={{ ok: true, items }} />);
}

describe("HomeAuthors", () => {
  // implements FR-4 of home-page-sections
  it("shows the cards in order with photo or avatar, name and a link; no description line when it is empty", () => {
    const { container } = renderSection([
      author(1),
      author(2, { photoUrl: null }),
      author(3, { description: null }),
    ]);

    expect(screen.getByRole("heading", { level: 2, name: SECTION_HEADINGS.authors })).toBeInTheDocument();
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/authors/a1", "/authors/a2", "/authors/a3"]);
    expect(links[0]).toHaveTextContent("Автор 1");
    expect(links[0]).toHaveTextContent("Описание 1");
    expect(links[2]).toHaveTextContent("Автор 3");
    expect(links[2]).not.toHaveTextContent("Описание");
    expect(container.querySelectorAll("img")).toHaveLength(2);
    expect(links[1].querySelector("svg")).not.toBeNull();
  });

  // implements FR-4 of home-page-sections
  it("renders nothing, heading included, when no author is chosen", () => {
    const { container } = renderSection([]);

    expect(container).toBeEmptyDOMElement();
  });

  // implements FR-7 of home-page-sections
  it("renders nothing for a failed result", () => {
    const { container } = render(<HomeAuthors result={{ ok: false }} />);

    expect(container).toBeEmptyDOMElement();
  });

  // implements FR-4 of home-page-sections
  it("has no «Все авторы» link", () => {
    renderSection([author(1)]);

    expect(screen.queryByRole("link", { name: /Все авторы/ })).toBeNull();
  });

  // implements NFR-5 of home-page-sections
  it("gives the photo an empty alt", () => {
    const { container } = renderSection([author(1)]);

    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HomeLatestWorks } from "../../components/HomeLatestWorks/HomeLatestWorks";
import { SECTION_HEADINGS } from "../../model/home-messages";
import type { LatestWork } from "../../model/home-section.types";

function work(index: number): LatestWork {
  return { id: `poem-${index}`, title: `Стихотворение ${index}`, authorName: `Автор ${index}`, href: `/authors/a${index}/poems/p${index}` };
}

describe("HomeLatestWorks", () => {
  // implements FR-5 of home-page-sections
  it("lists the rows in the given order with the title as the link and the author's name beside it", () => {
    render(<HomeLatestWorks result={{ ok: true, items: [work(1), work(2), work(3)] }} />);

    expect(screen.getByRole("heading", { level: 2, name: SECTION_HEADINGS.latestWorks })).toBeInTheDocument();
    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["Стихотворение 1", "Стихотворение 2", "Стихотворение 3"]);
    expect(links[0]).toHaveAttribute("href", "/authors/a1/poems/p1");
    expect(screen.getAllByRole("listitem")[0]).toHaveTextContent("Автор 1");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  // implements FR-5 of home-page-sections
  it("renders nothing, heading included, when there is no poem", () => {
    const { container } = render(<HomeLatestWorks result={{ ok: true, items: [] }} />);

    expect(container).toBeEmptyDOMElement();
  });

  // implements FR-7 of home-page-sections
  it("renders nothing for a failed result", () => {
    const { container } = render(<HomeLatestWorks result={{ ok: false }} />);

    expect(container).toBeEmptyDOMElement();
  });

  // implements FR-5 of home-page-sections
  it("has no «Все публикации» link and no cover", () => {
    const { container } = render(<HomeLatestWorks result={{ ok: true, items: [work(1)] }} />);

    expect(screen.queryByRole("link", { name: /Все публикации/ })).toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });
});

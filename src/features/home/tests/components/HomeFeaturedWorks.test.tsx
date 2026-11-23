import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HomeFeaturedWorks } from "../../components/HomeFeaturedWorks/HomeFeaturedWorks";
import { SECTION_HEADINGS } from "../../model/home-messages";
import type { FeaturedWork } from "../../model/home-section.types";

const COVER_URL = "http://127.0.0.1:54321/storage/v1/object/public/poem-illustrations/cover.jpg";
// A remote host keeps the optimizer on, which is what emits the `sizes` attribute.
const REMOTE_COVER_URL = "https://abc.supabase.co/storage/v1/object/public/poem-illustrations/cover.jpg";

function work(index: number, coverUrl: string | null = COVER_URL): FeaturedWork {
  return {
    id: `poem-${index}`,
    title: `Стихотворение ${index}`,
    authorName: `Автор ${index}`,
    href: `/authors/a${index}/poems/p${index}`,
    coverUrl,
  };
}

function renderSection(items: readonly FeaturedWork[]) {
  return render(<HomeFeaturedWorks result={{ ok: true, items }} />);
}

describe("HomeFeaturedWorks", () => {
  // implements FR-2, NFR-5 of home-page-sections
  it("shows four cards in the given order, each a link named title and author, one with the placeholder cover", () => {
    const items = [work(1), work(2), work(3, null), work(4)];
    const { container } = renderSection(items);

    expect(screen.getByRole("heading", { level: 2, name: SECTION_HEADINGS.featuredWorks })).toBeInTheDocument();
    const links = within(screen.getByRole("list")).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("aria-label"))).toEqual([
      "Стихотворение 1, Автор 1",
      "Стихотворение 2, Автор 2",
      "Стихотворение 3, Автор 3",
      "Стихотворение 4, Автор 4",
    ]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual(items.map((item) => item.href));
    expect(container.querySelectorAll("img")).toHaveLength(3);
    expect(container.querySelectorAll("a svg")).toHaveLength(1);
  });

  // implements FR-2 of home-page-sections
  it("renders nothing, heading included, for an empty result", () => {
    const { container } = renderSection([]);

    expect(container).toBeEmptyDOMElement();
  });

  // implements FR-7 of home-page-sections
  it("renders nothing for a failed result", () => {
    const { container } = render(<HomeFeaturedWorks result={{ ok: false }} />);

    expect(container).toBeEmptyDOMElement();
  });

  // implements FR-2 of home-page-sections
  it("shows exactly two cards and no empty slot when two are chosen", () => {
    renderSection([work(1), work(2)]);

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  // implements FR-2 of home-page-sections
  it("has no «Все произведения» link", () => {
    renderSection([work(1)]);

    expect(screen.queryByRole("link", { name: /Все произведения/ })).toBeNull();
  });

  // implements NFR-3, NFR-5 of home-page-sections
  it("gives each cover a fixed 16:9 box, an empty alt and a sizes hint", () => {
    const { container } = renderSection([work(1, REMOTE_COVER_URL)]);

    const image = container.querySelector("img");
    expect(image).toHaveAttribute("alt", "");
    expect(image).toHaveAttribute("sizes");
    expect(image?.parentElement).toHaveClass("aspect-video");
  });
});

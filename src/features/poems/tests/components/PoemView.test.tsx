import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PoemView } from "../../components/PoemView/PoemView";
import type { Poem } from "../../model/poem.types";

const STANZA_ONE = ["Листва ложится на дорожки,", "Шуршит под шагом тишина,", "И капли светятся, как брошки,", "На тёмной ветке у окна."];
const STANZA_TWO = ["Ещё тепло, но день короче,", "И пахнет яблоком в траве,", "И сад молчит, и между прочим", "Хранит всё лето в голове."];

const AUTUMN_GARDEN: Poem = {
  id: "osenniy-sad",
  title: "Осенний сад",
  text: [...STANZA_ONE, "", ...STANZA_TWO].join("\n"),
  illustrationSrc: "/mock-poems/osenniy-sad.svg",
  publishedAt: "2026-03-12",
  genre: "Лирика",
};

function follows(earlier: Node, later: Node): boolean {
  return Boolean(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING);
}

describe("PoemView", () => {
  // implements FR-4, NFR-6 of add-author-poems
  it("shows the illustration first, then the h1, the stanzas, and the footer, on a lang=ru root", () => {
    const { container } = render(<PoemView poem={AUTUMN_GARDEN} />);

    const image = screen.getByRole("img", { name: "Иллюстрация: Осенний сад" });
    const heading = screen.getByRole("heading", { level: 1, name: "Осенний сад" });
    // A footer inside an article is not a contentinfo landmark, so it's found by tag.
    const footer = container.querySelector("article > footer");
    const paragraphs = container.querySelectorAll("p");

    expect(footer).not.toBeNull();
    expect(paragraphs).toHaveLength(2);
    expect(follows(image, heading)).toBe(true);
    expect(follows(heading, paragraphs[0])).toBe(true);
    expect(follows(paragraphs[1], footer as Node)).toBe(true);
    expect(container.firstElementChild).toHaveAttribute("lang", "ru");
  });

  // implements FR-4 of add-author-poems
  it("keeps every line break inside a stanza", () => {
    const { container } = render(<PoemView poem={AUTUMN_GARDEN} />);

    const [first, second] = container.querySelectorAll("p");
    expect(first.textContent).toBe(STANZA_ONE.join("\n"));
    expect(second.textContent).toBe(STANZA_TWO.join("\n"));
    expect(first).toHaveClass("whitespace-pre-line");
  });

  // implements FR-4, NFR-6 of add-author-poems
  it("shows the date in a <time datetime> element and the genre line in the footer", () => {
    const { container } = render(<PoemView poem={AUTUMN_GARDEN} />);

    const footer = container.querySelector("article > footer");
    const time = footer?.querySelector("time");
    expect(time).toHaveAttribute("datetime", "2026-03-12");
    expect(time).toHaveTextContent("12 марта 2026 г.");
    expect(footer).toHaveTextContent("Жанр: Лирика");
  });

  // implements FR-4 of add-author-poems
  it("shows Markdown and HTML in the text literally", () => {
    const { container } = render(<PoemView poem={{ ...AUTUMN_GARDEN, text: "**Bold** <b>tag</b>" }} />);

    expect(container.querySelector("p")?.textContent).toBe("**Bold** <b>tag</b>");
    expect(container.querySelector("b, strong")).toBeNull();
  });

  it("serves an SVG illustration as is, not through the optimizer", () => {
    render(<PoemView poem={AUTUMN_GARDEN} />);

    expect(screen.getByRole("img").getAttribute("src")).toBe("/mock-poems/osenniy-sad.svg");
  });

  it("keeps optimization for a raster illustration", () => {
    render(<PoemView poem={{ ...AUTUMN_GARDEN, illustrationSrc: "/mock-poems/osenniy-sad.png" }} />);

    expect(screen.getByRole("img").getAttribute("src")).toContain("/_next/image");
  });
});

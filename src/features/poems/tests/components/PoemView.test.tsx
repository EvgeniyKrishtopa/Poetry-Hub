import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PoemView } from "../../components/PoemView/PoemView";
import type { PoemGenreName } from "../../model/poem.types";
import { AUTUMN_GARDEN } from "../poem-fixtures";

const LYRIC: PoemGenreName = { kind: "named", name: "Лирика" };
const NO_GENRE: PoemGenreName = { kind: "none" };

const [STANZA_ONE, STANZA_TWO] = AUTUMN_GARDEN.text.split("\n\n");

function follows(earlier: Node, later: Node): boolean {
  return Boolean(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING);
}

describe("PoemView", () => {
  // implements FR-4, NFR-6 of add-author-poems
  it("shows the illustration first, then the h1, the stanzas, and the footer, on a lang=ru root", () => {
    const { container } = render(<PoemView poem={AUTUMN_GARDEN} genre={LYRIC} />);

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

  // implements FR-9 of add-poem-creation
  it("serves the stored illustration through the image optimizer", () => {
    render(<PoemView poem={AUTUMN_GARDEN} genre={LYRIC} />);

    const src = screen.getByRole("img").getAttribute("src") ?? "";
    expect(src).toContain("/_next/image");
    expect(decodeURIComponent(src)).toContain(AUTUMN_GARDEN.illustrationUrl);
  });

  // implements FR-9 of add-poem-creation
  it("starts with the heading and holds no image when the poem has no illustration", () => {
    const { container } = render(<PoemView poem={{ ...AUTUMN_GARDEN, illustrationUrl: null }} genre={LYRIC} />);

    expect(screen.queryByRole("img")).toBeNull();
    expect(container.querySelector("article")?.firstElementChild?.tagName).toBe("H1");
  });

  // implements FR-4 of add-author-poems
  it("keeps every line break inside a stanza", () => {
    const { container } = render(<PoemView poem={AUTUMN_GARDEN} genre={LYRIC} />);

    const [first, second] = container.querySelectorAll("p");
    expect(first.textContent).toBe(STANZA_ONE);
    expect(second.textContent).toBe(STANZA_TWO);
    expect(first).toHaveClass("whitespace-pre-line");
  });

  // implements FR-4, NFR-6 of add-author-poems
  // implements FR-9 of add-poem-creation
  it("shows the date in a <time datetime> element and the named genre line in the footer", () => {
    const { container } = render(<PoemView poem={AUTUMN_GARDEN} genre={LYRIC} />);

    const footer = container.querySelector("article > footer");
    const time = footer?.querySelector("time");
    expect(time).toHaveAttribute("datetime", "2026-03-12");
    expect(time).toHaveTextContent("12 марта 2026 г.");
    expect(footer).toHaveTextContent("Жанр: Лирика");
  });

  // implements FR-10 of add-poem-creation
  it("leaves the genre line out when there is no genre name", () => {
    const { container } = render(<PoemView poem={AUTUMN_GARDEN} genre={NO_GENRE} />);

    const footer = container.querySelector("article > footer");
    expect(footer).not.toHaveTextContent("Жанр");
    expect(footer?.querySelector("time")).not.toBeNull();
  });

  // implements FR-4 of add-author-poems
  it("shows Markdown and HTML in the text literally", () => {
    const { container } = render(<PoemView poem={{ ...AUTUMN_GARDEN, text: "**Bold** <b>tag</b>" }} genre={LYRIC} />);

    expect(container.querySelector("p")?.textContent).toBe("**Bold** <b>tag</b>");
    expect(container.querySelector("b, strong")).toBeNull();
  });
});

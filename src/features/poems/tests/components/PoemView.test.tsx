import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { INDENT_STEP } from "@/shared/lib/markdown/markdown.constants";

import { PoemView } from "../../components/PoemView/PoemView";
import type { Poem, PoemGenreName } from "../../model/poem.types";
import { AUTUMN_GARDEN } from "../poem-fixtures";

const LYRIC: PoemGenreName = { kind: "named", name: "Лирика" };
const NO_GENRE: PoemGenreName = { kind: "none" };

const [STANZA_ONE, STANZA_TWO] = AUTUMN_GARDEN.text.split("\n\n");

function follows(earlier: Node, later: Node): boolean {
  return Boolean(earlier.compareDocumentPosition(later) & Node.DOCUMENT_POSITION_FOLLOWING);
}

function renderText(text: string) {
  return render(<PoemView poem={{ ...AUTUMN_GARDEN, text }} genre={LYRIC} />);
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

  // implements FR-4 of add-author-poems (as modified by add-poem-creation)
  it("fills a 16:9 frame with the illustration, cropped at its edges", () => {
    render(<PoemView poem={AUTUMN_GARDEN} genre={LYRIC} />);

    const image = screen.getByRole("img");
    expect(image).toHaveClass("aspect-video", "w-full", "object-cover", "rounded-2xl");
    expect(image).not.toHaveClass("h-auto");
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
    const poem: Poem = { ...AUTUMN_GARDEN, illustrationUrl: null };
    const { container } = render(<PoemView poem={poem} genre={LYRIC} />);

    expect(screen.queryByRole("img")).toBeNull();
    expect(container.querySelector("article")?.firstElementChild?.tagName).toBe("H1");
  });

  // implements FR-4 of add-author-poems
  // implements FR-10 of add-poem-creation
  it("keeps every line break inside a stanza, in the poem Markdown styles", () => {
    const { container } = render(<PoemView poem={AUTUMN_GARDEN} genre={LYRIC} />);

    const [first, second] = container.querySelectorAll("p");
    expect(first.textContent).toBe(STANZA_ONE);
    expect(second.textContent).toBe(STANZA_TWO);
    expect(first.parentElement).toHaveClass("poem");
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

  // implements FR-10 of add-poem-creation
  it("renders Markdown bold and keeps a single line break visible", () => {
    const { container } = renderText("**Тёмный** сад\nи тишина");

    expect(container.querySelector("strong")).toHaveTextContent("Тёмный");
    expect(container.querySelector("p")?.textContent).toBe("Тёмный сад\nи тишина");
  });

  // implements FR-10 of add-poem-creation
  it("shows the epigraph, the part separator between stanzas, and an indented line's em spaces", () => {
    const { container } = renderText(`> Эпиграф\n\nпервая\n\n* * *\n\nвторая\n${INDENT_STEP}сдвинутая`);

    expect(container.querySelector("blockquote")).toHaveClass("epigraph");
    const separator = screen.getByRole("separator");
    const [, first, second] = container.querySelectorAll("p");
    expect(follows(first, separator)).toBe(true);
    expect(follows(separator, second)).toBe(true);
    expect(second.textContent).toBe(`вторая\n${INDENT_STEP}сдвинутая`);
  });

  // implements NFR-5 of add-poem-creation
  it("renders no script or raw tag, and a link as its text", () => {
    const { container } = renderText("<b>plain</b> [сайт](https://evil.example)\n\n<script>alert(1)</script>");

    expect(container.querySelector("script, b, a")).toBeNull();
    expect(container).toHaveTextContent("plain сайт");
    expect(container).not.toHaveTextContent("alert(1)");
  });
});

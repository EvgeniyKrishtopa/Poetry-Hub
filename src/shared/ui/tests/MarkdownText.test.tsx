import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { INDENT_STEP } from "@/shared/lib/markdown/markdown.constants";

import { MarkdownText } from "../MarkdownText/MarkdownText";

describe("MarkdownText (about)", () => {
  // implements FR-14 of add-author-profiles
  it("renders ## as a level-2 heading", () => {
    render(<MarkdownText markdown="## Poet" />);

    expect(screen.getByRole("heading", { level: 2, name: "Poet" })).toBeInTheDocument();
  });

  it("renders emphasis, lists, and quotes", () => {
    const { container } = render(<MarkdownText markdown={"**bold** *it*\n\n- one\n\n> quote"} />);

    expect(container.querySelector("strong")).toHaveTextContent("bold");
    expect(container.querySelector("em")).toHaveTextContent("it");
    expect(screen.getByRole("listitem")).toHaveTextContent("one");
    expect(container.querySelector("blockquote")).toHaveTextContent("quote");
  });

  // implements NFR-1 of add-author-profiles
  it("renders no script element from raw HTML", () => {
    const { container } = render(<MarkdownText markdown={"Hello\n\n<script>alert(1)</script>"} />);

    expect(container.querySelector("script")).toBeNull();
    expect(container).not.toHaveTextContent("alert(1)");
  });

  // implements NFR-1 of add-author-profiles
  it("renders a link as its text with no a element", () => {
    const { container } = render(<MarkdownText markdown="[site](https://evil.example)" />);

    expect(container.querySelector("a")).toBeNull();
    expect(container).toHaveTextContent("site");
  });

  // implements NFR-1 of add-author-profiles
  it("renders an image as its alt text with no img element", () => {
    const { container } = render(<MarkdownText markdown="![portrait](https://evil.example/x.png)" />);

    expect(container.querySelector("img")).toBeNull();
    expect(container).toHaveTextContent("portrait");
  });

  // implements NFR-1 of add-author-profiles
  it("renders nothing for an image with empty alt text", () => {
    const { container } = render(<MarkdownText markdown={"before ![](https://evil.example/x.png) after"} />);

    expect(container.querySelector("img")).toBeNull();
    expect(container).toHaveTextContent("before after");
    expect(container.innerHTML).not.toContain("evil.example");
  });

  it("keeps a level-1 heading's text without the element", () => {
    render(<MarkdownText markdown="# Title" />);

    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(screen.getByText("Title")).toBeInTheDocument();
  });

  // implements FR-3 of refine-author-page-and-contact
  it("renders a heading and a list left-aligned, with no alignment class", () => {
    const { container } = render(<MarkdownText markdown={"## Поэт\n\n- первый\n- второй"} />);

    expect(screen.getByRole("heading", { level: 2, name: "Поэт" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(container.firstElementChild).not.toHaveClass("text-center");
    expect(container.firstElementChild).not.toHaveClass("text-right");
  });

  // implements FR-10 of add-poem-creation
  it("defaults to the about styles, which don't keep a single line break visible", () => {
    const { container } = render(<MarkdownText markdown={"one\ntwo"} />);

    expect(container.firstElementChild).toHaveClass("about");
    expect(container.firstElementChild).not.toHaveClass("poem");
  });
});

describe("MarkdownText (poem)", () => {
  function renderPoem(markdown: string) {
    return render(<MarkdownText markdown={markdown} variant="poem" />);
  }

  // implements FR-10 of add-poem-creation
  it("keeps a single line break inside the paragraph, under the pre-line class", () => {
    const { container } = renderPoem("**Bold** line\nsecond line");

    expect(container.firstElementChild).toHaveClass("poem");
    expect(container.querySelector("strong")).toHaveTextContent("Bold");
    expect(container.querySelectorAll("p")).toHaveLength(1);
    expect(container.querySelector("p")?.textContent).toBe("Bold line\nsecond line");
  });

  // implements FR-10, FR-3 of add-poem-creation
  it("renders a blockquote as the epigraph and a thematic break as the separator", () => {
    const { container } = renderPoem("> Эпиграф\n\nстрофа\n\n* * *\n\nстрофа");

    expect(container.querySelector("blockquote")).toHaveClass("epigraph");
    expect(container.querySelector("blockquote")).toHaveTextContent("Эпиграф");
    expect(screen.getByRole("separator")).toHaveClass("separator");
  });

  // implements FR-10, FR-3 of add-poem-creation
  it("keeps the leading em spaces of an indented line", () => {
    const { container } = renderPoem(`строка\n${INDENT_STEP}${INDENT_STEP}сдвинутая`);

    expect(container.querySelector("p")?.textContent).toBe(`строка\n${INDENT_STEP}${INDENT_STEP}сдвинутая`);
  });

  it("keeps the em spaces of an indented first line", () => {
    const { container } = renderPoem(`${INDENT_STEP}первая`);

    expect(container.querySelector("p")?.textContent).toBe(`${INDENT_STEP}первая`);
  });

  // implements NFR-5 of add-poem-creation
  it("renders hand-typed headings and lists as their text", () => {
    const { container } = renderPoem("## Часть\n\n- строка");

    expect(container.querySelector("h2, ul, li")).toBeNull();
    expect(container).toHaveTextContent("Часть");
    expect(container).toHaveTextContent("строка");
  });

  // implements NFR-5 of add-poem-creation
  it("renders no script element and no raw tag", () => {
    const { container } = renderPoem("<b>tag</b> plain\n\n<script>alert(1)</script>");

    expect(container.querySelector("script, b")).toBeNull();
    expect(container).toHaveTextContent("plain");
  });

  // implements NFR-5 of add-poem-creation
  it("renders links and images as their text", () => {
    const { container } = renderPoem("[site](https://evil.example) ![рисунок](https://evil.example/x.png)");

    expect(container.querySelector("a, img")).toBeNull();
    expect(container).toHaveTextContent("site рисунок");
  });
});

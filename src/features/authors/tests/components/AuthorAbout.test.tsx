import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AuthorAbout } from "../../components/AuthorAbout/AuthorAbout";

describe("AuthorAbout", () => {
  // implements FR-14 of add-author-profiles
  it("renders ## as a level-2 heading", () => {
    render(<AuthorAbout markdown="## Poet" align="left" />);

    expect(screen.getByRole("heading", { level: 2, name: "Poet" })).toBeInTheDocument();
  });

  it("renders emphasis, lists, and quotes", () => {
    const { container } = render(<AuthorAbout markdown={"**bold** *it*\n\n- one\n\n> quote"} align="left" />);

    expect(container.querySelector("strong")).toHaveTextContent("bold");
    expect(container.querySelector("em")).toHaveTextContent("it");
    expect(screen.getByRole("listitem")).toHaveTextContent("one");
    expect(container.querySelector("blockquote")).toHaveTextContent("quote");
  });

  // implements NFR-1 of add-author-profiles
  it("renders no script element from raw HTML", () => {
    const { container } = render(<AuthorAbout markdown={"Hello\n\n<script>alert(1)</script>"} align="left" />);

    expect(container.querySelector("script")).toBeNull();
    expect(container).not.toHaveTextContent("alert(1)");
  });

  // implements NFR-1 of add-author-profiles
  it("renders a link as its text with no a element", () => {
    const { container } = render(<AuthorAbout markdown="[site](https://evil.example)" align="left" />);

    expect(container.querySelector("a")).toBeNull();
    expect(container).toHaveTextContent("site");
  });

  // implements NFR-1 of add-author-profiles
  it("renders an image as its alt text with no img element", () => {
    const { container } = render(<AuthorAbout markdown="![portrait](https://evil.example/x.png)" align="left" />);

    expect(container.querySelector("img")).toBeNull();
    expect(container).toHaveTextContent("portrait");
  });

  it("keeps a level-1 heading's text without the element", () => {
    render(<AuthorAbout markdown="# Title" align="left" />);

    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(screen.getByText("Title")).toBeInTheDocument();
  });

  // implements FR-14 of add-author-profiles
  it.each([
    ["center", "text-center"],
    ["right", "text-right"],
    ["left", "text-left"],
  ] as const)("applies the %s alignment class", (align, className) => {
    const { container } = render(<AuthorAbout markdown="text" align={align} />);

    expect(container.firstElementChild).toHaveClass(className);
  });

  it("moves list markers inside only for centred and right-aligned text", () => {
    const { container: centred } = render(<AuthorAbout markdown="- a" align="center" />);
    const { container: left } = render(<AuthorAbout markdown="- a" align="left" />);

    expect(centred.firstElementChild).toHaveClass("inlineLists");
    expect(left.firstElementChild).not.toHaveClass("inlineLists");
  });
});

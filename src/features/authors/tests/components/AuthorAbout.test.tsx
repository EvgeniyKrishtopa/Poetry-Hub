import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AuthorAbout } from "../../components/AuthorAbout/AuthorAbout";

describe("AuthorAbout", () => {
  // implements FR-14 of add-author-profiles
  it("renders ## as a level-2 heading", () => {
    render(<AuthorAbout markdown="## Poet" />);

    expect(screen.getByRole("heading", { level: 2, name: "Poet" })).toBeInTheDocument();
  });

  it("renders emphasis, lists, and quotes", () => {
    const { container } = render(<AuthorAbout markdown={"**bold** *it*\n\n- one\n\n> quote"} />);

    expect(container.querySelector("strong")).toHaveTextContent("bold");
    expect(container.querySelector("em")).toHaveTextContent("it");
    expect(screen.getByRole("listitem")).toHaveTextContent("one");
    expect(container.querySelector("blockquote")).toHaveTextContent("quote");
  });

  // implements NFR-1 of add-author-profiles
  it("renders no script element from raw HTML", () => {
    const { container } = render(<AuthorAbout markdown={"Hello\n\n<script>alert(1)</script>"} />);

    expect(container.querySelector("script")).toBeNull();
    expect(container).not.toHaveTextContent("alert(1)");
  });

  // implements NFR-1 of add-author-profiles
  it("renders a link as its text with no a element", () => {
    const { container } = render(<AuthorAbout markdown="[site](https://evil.example)" />);

    expect(container.querySelector("a")).toBeNull();
    expect(container).toHaveTextContent("site");
  });

  // implements NFR-1 of add-author-profiles
  it("renders an image as its alt text with no img element", () => {
    const { container } = render(<AuthorAbout markdown="![portrait](https://evil.example/x.png)" />);

    expect(container.querySelector("img")).toBeNull();
    expect(container).toHaveTextContent("portrait");
  });

  // implements NFR-1 of add-author-profiles
  it("renders nothing for an image with empty alt text", () => {
    const { container } = render(<AuthorAbout markdown={"before ![](https://evil.example/x.png) after"} />);

    expect(container.querySelector("img")).toBeNull();
    expect(container).toHaveTextContent("before after");
    expect(container.innerHTML).not.toContain("evil.example");
  });

  it("keeps a level-1 heading's text without the element", () => {
    render(<AuthorAbout markdown="# Title" />);

    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(screen.getByText("Title")).toBeInTheDocument();
  });

  // implements FR-3 of refine-author-page-and-contact
  it("renders a heading and a list left-aligned, with no alignment class", () => {
    const { container } = render(<AuthorAbout markdown={"## Поэт\n\n- первый\n- второй"} />);

    expect(screen.getByRole("heading", { level: 2, name: "Поэт" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(container.firstElementChild).not.toHaveClass("text-center");
    expect(container.firstElementChild).not.toHaveClass("text-right");
  });
});

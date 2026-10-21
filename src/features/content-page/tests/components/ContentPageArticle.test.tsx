import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ContentPageArticle } from "../../components/ContentPageArticle/ContentPageArticle";

function renderArticle(message: string, title = "О проекте") {
  return render(<ContentPageArticle entry={{ title, message }} />);
}

describe("ContentPageArticle", () => {
  // implements FR-1 of add-about-page
  it("shows the title as the only level-1 heading and one paragraph per blank-line block", () => {
    const { container } = renderArticle("Первая строка\nвторая строка\n\nВторой абзац");

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "О проекте" })).toBeInTheDocument();

    const paragraphs = container.querySelectorAll("article p");
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0].textContent).toBe("Первая строка\nвторая строка");
    expect(paragraphs[0]).toHaveClass("whitespace-pre-line");
    expect(paragraphs[1].textContent).toBe("Второй абзац");
  });

  // implements NFR-3 of add-about-page
  it("renders Markdown and HTML markup as literal text", () => {
    const { container } = renderArticle("**Жирный** <b>тег</b>");

    expect(screen.getByText("**Жирный** <b>тег</b>")).toBeInTheDocument();
    expect(container.querySelector("b, strong")).toBeNull();
  });
});

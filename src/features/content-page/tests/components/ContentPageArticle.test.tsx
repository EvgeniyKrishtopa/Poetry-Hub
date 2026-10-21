import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ContentPageArticle } from "../../components/ContentPageArticle/ContentPageArticle";

const PRIVACY_TITLE = "Политика конфиденциальности";

function renderArticle(message: string, title = PRIVACY_TITLE) {
  return render(<ContentPageArticle entry={{ title, message }} />);
}

describe("ContentPageArticle", () => {
  // implements FR-1 of add-privacy-policy-page
  it("shows the title as the only level-1 heading and one paragraph per blank-line block", () => {
    // The schema has already trimmed the fields; a whitespace-only line still separates paragraphs.
    const { container } = renderArticle("Первый абзац.\nВторая строка.\n\n  \nВторой абзац.");

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: PRIVACY_TITLE })).toBeInTheDocument();

    const paragraphs = container.querySelectorAll("article p");
    expect(paragraphs).toHaveLength(2);
    expect(paragraphs[0].textContent).toBe("Первый абзац.\nВторая строка.");
    expect(paragraphs[0]).toHaveClass("whitespace-pre-line");
    expect(paragraphs[1].textContent).toBe("Второй абзац.");
  });

  // implements NFR-3 of add-privacy-policy-page
  it("renders Markdown and HTML markup as literal text", () => {
    const { container } = renderArticle("<b>жирный</b> и **жирный**");

    expect(screen.getByText("<b>жирный</b> и **жирный**")).toBeInTheDocument();
    expect(container.querySelector("b, strong")).toBeNull();
  });
});

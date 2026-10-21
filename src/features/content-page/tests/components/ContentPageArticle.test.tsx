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

  // implements FR-7 of add-privacy-policy-page
  it("renders numbered first lines as bold section and subsection headings", () => {
    const { container } = renderArticle(
      "Раздел 1. Введение\n\nТекст.\n2.2. Не заголовок\n\n2.1. Данные\n* Пункт\n\n3.1 Без точки\n\n2.1.3. Глубже",
    );

    const article = container.querySelector("article");
    expect(article?.querySelectorAll("h2, h3")).toHaveLength(2);
    const section = screen.getByRole("heading", { level: 2, name: "Раздел 1. Введение" });
    const subsection = screen.getByRole("heading", { level: 3, name: "2.1. Данные" });
    expect(section).toHaveClass("font-bold");
    expect(subsection).toHaveClass("font-bold");

    const blocks = Array.from(article?.children ?? []).map((element) => [element.tagName, element.textContent]);
    expect(blocks).toEqual([
      ["H2", "Раздел 1. Введение"],
      ["P", "Текст.\n2.2. Не заголовок"],
      ["H3", "2.1. Данные"],
      ["P", "* Пункт"],
      ["P", "3.1 Без точки"],
      ["P", "2.1.3. Глубже"],
    ]);
  });

  // implements NFR-3 of add-privacy-policy-page
  it("renders Markdown and HTML markup as literal text", () => {
    const { container } = renderArticle("<b>жирный</b> и **жирный**");

    expect(screen.getByText("<b>жирный</b> и **жирный**")).toBeInTheDocument();
    expect(container.querySelector("b, strong")).toBeNull();
  });
});

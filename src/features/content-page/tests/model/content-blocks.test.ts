import { describe, expect, it } from "vitest";

import { splitParagraphs } from "@/shared/lib/split-paragraphs";

import { toContentBlocks } from "../../model/content-blocks";

const FR7_EXAMPLE =
  "Раздел 1. Введение\n\nТекст.\n2.2. Не заголовок\n\n2.1. Данные\n* Пункт\n\n3.1 Без точки\n\n2.1.3. Глубже";

describe("toContentBlocks", () => {
  // implements FR-7 of add-privacy-policy-page
  it("turns a paragraph's numbered first line into a section or subsection heading", () => {
    expect(toContentBlocks(FR7_EXAMPLE)).toEqual([
      { kind: "section", text: "Раздел 1. Введение" },
      { kind: "paragraph", text: "Текст.\n2.2. Не заголовок" },
      { kind: "subsection", text: "2.1. Данные" },
      { kind: "paragraph", text: "* Пункт" },
      { kind: "paragraph", text: "3.1 Без точки" },
      { kind: "paragraph", text: "2.1.3. Глубже" },
    ]);
  });

  // implements FR-7 of add-privacy-policy-page
  it("recognises a heading line after leading whitespace and trims it", () => {
    expect(toContentBlocks("Первый.\n\n   Раздел 2. Данные  \nСтрока.")).toEqual([
      { kind: "paragraph", text: "Первый." },
      { kind: "section", text: "Раздел 2. Данные" },
      { kind: "paragraph", text: "Строка." },
    ]);
  });

  // implements FR-7 of add-privacy-policy-page
  it("gives the same paragraphs as splitParagraphs when no first line is numbered", () => {
    const message = "Первый абзац.\nВторая строка.\n\n  \nВторой абзац.";

    expect(toContentBlocks(message)).toEqual(
      splitParagraphs(message).map((text) => ({ kind: "paragraph", text })),
    );
  });
});

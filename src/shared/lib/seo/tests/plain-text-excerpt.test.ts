import { describe, expect, it } from "vitest";

import { INDENT_STEP } from "@/shared/lib/markdown/markdown.constants";

import { DESCRIPTION_MAX_LENGTH } from "../seo.constants";
import { toPlainTextExcerpt } from "../plain-text-excerpt";

const LIMIT = DESCRIPTION_MAX_LENGTH;
const ELLIPSIS = "…";
const LONG_TEXT_LENGTH = 400;

function repeatToLength(unit: string, length: number): string {
  return unit.repeat(Math.ceil(length / unit.length)).slice(0, length);
}

describe("toPlainTextExcerpt", () => {
  // implements NFR-4 of seo-metadata
  it("strips Markdown and collapses the line breaks", () => {
    expect(toPlainTextExcerpt("**Осень** пришла.\n\n> тихо", LIMIT)).toBe("Осень пришла. тихо");
  });

  // implements NFR-4 of seo-metadata
  it.each([
    ["bold", "**ночь** и *луна*", "ночь и луна"],
    ["heading", "## Заголовок\nтекст", "Заголовок текст"],
    ["subheading", "### Заголовок\nтекст", "Заголовок текст"],
    ["bulleted list", "- раз\n- два", "раз два"],
    ["asterisk list", "* раз\n* два", "раз два"],
    ["numbered list", "1. раз\n2. два", "раз два"],
    ["quote", "> раз\n> два", "раз два"],
    ["nested quote", "> > раз", "раз"],
    ["separator", "первая\n\n* * *\n\nвторая", "первая вторая"],
    ["dash separator", "первая\n---\nвторая", "первая вторая"],
    ["em-space indent", `${INDENT_STEP}первая\n${INDENT_STEP}вторая`, "первая вторая"],
    ["indented quote", `${INDENT_STEP}> первая`, "первая"],
    ["Windows line breaks", "первая\r\nвторая", "первая вторая"],
    ["runs of spaces and tabs", "а   б\t\tв", "а б в"],
  ])("removes %s", (_name, markdown, expected) => {
    expect(toPlainTextExcerpt(markdown, LIMIT)).toBe(expected);
  });

  // implements NFR-4 of seo-metadata
  it("reads a poem in the editor's formats: epigraph, indent, separator", () => {
    const poem = [
      "> Эпиграф",
      "",
      "Осень *пришла*",
      `${INDENT_STEP}и ушла.`,
      "",
      "* * *",
      "",
      "Зима.",
    ].join("\n");

    expect(toPlainTextExcerpt(poem, LIMIT)).toBe("Эпиграф Осень пришла и ушла. Зима.");
  });

  it("reads an about text in the editor's formats", () => {
    const about = "## О проекте\n\nМы **собираем** стихи:\n\n- читайте\n- публикуйте";

    expect(toPlainTextExcerpt(about, LIMIT)).toBe("О проекте Мы собираем стихи: читайте публикуйте");
  });

  it.each([
    ["an empty text", ""],
    ["only whitespace", " \n\t "],
    ["only Markdown syntax", "## \n> \n* * *"],
  ])("gives an empty string for %s", (_name, markdown) => {
    expect(toPlainTextExcerpt(markdown, LIMIT)).toBe("");
  });

  it("keeps a text exactly at the limit whole", () => {
    const atLimit = "а".repeat(LIMIT);

    expect(toPlainTextExcerpt(atLimit, LIMIT)).toBe(atLimit);
  });

  // implements NFR-4 of seo-metadata
  it("shortens a long text at a word and closes it with an ellipsis", () => {
    const words = repeatToLength("слово ", LONG_TEXT_LENGTH).trim();

    const result = toPlainTextExcerpt(words, LIMIT);

    expect(result.length).toBeLessThanOrEqual(LIMIT);
    expect(result.endsWith(ELLIPSIS)).toBe(true);
    const lastWord = result.slice(0, -ELLIPSIS.length).split(" ").pop();
    expect(lastWord).toBe("слово");
  });

  it("keeps the whole word that ends right at the cut", () => {
    const room = LIMIT - ELLIPSIS.length;
    const text = `${"а".repeat(room)} продолжение`;

    expect(toPlainTextExcerpt(text, LIMIT)).toBe(`${"а".repeat(room)}${ELLIPSIS}`);
  });

  // implements NFR-4 of seo-metadata
  it("cuts a text with no space hard: 159 characters and the ellipsis", () => {
    const unbroken = "а".repeat(LONG_TEXT_LENGTH);

    const result = toPlainTextExcerpt(unbroken, LIMIT);

    expect(result).toBe(`${"а".repeat(LIMIT - 1)}${ELLIPSIS}`);
    expect(result).toHaveLength(LIMIT);
  });
});

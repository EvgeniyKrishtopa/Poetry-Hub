import { describe, expect, it } from "vitest";

import type { FormattedText, MarkdownFormat } from "../../model/author.types";
import { applyFormat } from "../../model/markdown-format";

function selected({ text, selection }: FormattedText): string {
  return text.slice(selection.start, selection.end);
}

describe("applyFormat", () => {
  // implements FR-11 of add-author-profiles
  describe("with a selection", () => {
    it.each([
      ["bold", "a word b", "a **word** b", "word"],
      ["italic", "a word b", "a *word* b", "word"],
      ["heading", "a word b", "## a word b", "## a word b"],
      ["subheading", "a word b", "### a word b", "### a word b"],
      ["bulleted", "a word b", "- a word b", "- a word b"],
      ["numbered", "a word b", "1. a word b", "1. a word b"],
      ["quote", "a word b", "> a word b", "> a word b"],
    ] as const)("%s", (format: MarkdownFormat, text, expectedText, expectedSelection) => {
      const result = applyFormat(text, { start: 2, end: 6 }, format);

      expect(result.text).toBe(expectedText);
      expect(selected(result)).toBe(expectedSelection);
    });
  });

  describe("with an empty selection", () => {
    it.each([
      ["bold", "**текст**"],
      ["italic", "*текст*"],
      ["heading", "## текст"],
      ["subheading", "### текст"],
      ["bulleted", "- текст"],
      ["numbered", "1. текст"],
      ["quote", "> текст"],
    ] as const)("%s inserts the placeholder and selects it", (format: MarkdownFormat, expectedText) => {
      const result = applyFormat("", { start: 0, end: 0 }, format);

      expect(result.text).toBe(expectedText);
      expect(selected(result)).toBe("текст");
    });

    it("inserts an inline placeholder at the cursor", () => {
      const result = applyFormat("ab", { start: 1, end: 1 }, "bold");

      expect(result.text).toBe("a**текст**b");
      expect(selected(result)).toBe("текст");
    });

    it("puts a block placeholder on its own line in the middle of a line", () => {
      const result = applyFormat("ab", { start: 1, end: 1 }, "quote");

      expect(result.text).toBe("a\n> текст\nb");
      expect(selected(result)).toBe("текст");
    });

    it("adds no extra line break at the start of an empty line", () => {
      const result = applyFormat("one\n\ntwo", { start: 4, end: 4 }, "heading");

      expect(result.text).toBe("one\n## текст\ntwo");
      expect(selected(result)).toBe("текст");
    });
  });

  describe("multi-line block formats", () => {
    it("prefixes every line the selection touches, even partly", () => {
      const text = "intro\nfirst\nsecond\nthird";
      const result = applyFormat(text, { start: text.indexOf("rst"), end: text.indexOf("cond") }, "bulleted");

      expect(result.text).toBe("intro\n- first\n- second\nthird");
      expect(selected(result)).toBe("- first\n- second");
    });

    it("numbers each line from 1", () => {
      const result = applyFormat("a\nb\nc", { start: 0, end: 5 }, "numbered");

      expect(result.text).toBe("1. a\n2. b\n3. c");
      expect(selected(result)).toBe(result.text);
    });

    it("leaves the next line alone when the selection ends right after a line break", () => {
      const result = applyFormat("a\nb", { start: 0, end: 2 }, "quote");

      expect(result.text).toBe("> a\nb");
      expect(selected(result)).toBe("> a");
    });

    it("starts at the first line when the text begins with a line break", () => {
      const result = applyFormat("\nb", { start: 0, end: 2 }, "quote");

      expect(result.text).toBe("> \n> b");
    });
  });

  it("wraps a multi-line selection inline as one span", () => {
    const result = applyFormat("a\nb", { start: 0, end: 3 }, "italic");

    expect(result.text).toBe("*a\nb*");
    expect(selected(result)).toBe("a\nb");
  });
});

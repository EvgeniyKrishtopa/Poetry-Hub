import { describe, expect, it } from "vitest";
import { z } from "zod";

import { poemFormSchema, toPoemFieldErrors } from "../../model/poem-form.schema";
import { POEM_FIELD_ERRORS } from "../../model/poem-management-messages";
import { NO_GENRE, TEXT_MAX_LENGTH, TITLE_MAX_LENGTH } from "../../model/poem-management.constants";
import { ownPoemPath } from "../../model/poem-paths";

const GENRE_ID = "lyric";
const INDENT_STEP = "  ";
/** One code point, two UTF-16 units. */
const ASTRAL = "\u{1F338}";

const VALID = { title: "Первый снег", text: "строка один\nстрока два", genreId: GENRE_ID };

function fieldErrors(input: Record<string, unknown>) {
  const result = poemFormSchema.safeParse(input);
  if (result.success) throw new Error("expected the input to be invalid");
  return toPoemFieldErrors(result.error);
}

// implements FR-4 of add-poem-creation
describe("poemFormSchema", () => {
  it("accepts a valid form and trims the title", () => {
    expect(poemFormSchema.parse({ ...VALID, title: "  Первый снег  " })).toEqual(VALID);
  });

  it("requires every field: empty title, empty text, and the «—» placeholder", () => {
    expect(fieldErrors({ title: "", text: "", genreId: "" })).toEqual({
      title: POEM_FIELD_ERRORS.required,
      text: POEM_FIELD_ERRORS.required,
      genreId: POEM_FIELD_ERRORS.required,
    });
  });

  it("requires every field when a value is missing altogether", () => {
    expect(fieldErrors({})).toEqual({
      title: POEM_FIELD_ERRORS.required,
      text: POEM_FIELD_ERRORS.required,
      genreId: POEM_FIELD_ERRORS.required,
    });
  });

  it("treats a whitespace-only title or text as empty", () => {
    expect(fieldErrors({ ...VALID, title: "   ", text: ` \n\t\n${INDENT_STEP}\r\n ` })).toEqual({
      title: POEM_FIELD_ERRORS.required,
      text: POEM_FIELD_ERRORS.required,
    });
  });

  it("allows an 80-character title and rejects 81", () => {
    expect(poemFormSchema.safeParse({ ...VALID, title: "а".repeat(TITLE_MAX_LENGTH) }).success).toBe(true);
    expect(fieldErrors({ ...VALID, title: "а".repeat(TITLE_MAX_LENGTH + 1) })).toEqual({
      title: POEM_FIELD_ERRORS.titleTooLong,
    });
  });

  it("allows a 10000-character text and rejects 10001", () => {
    expect(poemFormSchema.safeParse({ ...VALID, text: "а".repeat(TEXT_MAX_LENGTH) }).success).toBe(true);
    expect(fieldErrors({ ...VALID, text: "а".repeat(TEXT_MAX_LENGTH + 1) })).toEqual({
      text: POEM_FIELD_ERRORS.textTooLong,
    });
  });

  it("counts code points, not UTF-16 units", () => {
    expect(poemFormSchema.safeParse({ ...VALID, title: ASTRAL.repeat(TITLE_MAX_LENGTH) }).success).toBe(true);
    expect(poemFormSchema.safeParse({ ...VALID, text: ASTRAL.repeat(TEXT_MAX_LENGTH) }).success).toBe(true);
  });

  it("counts a \\r\\n line break once and stores \\n only: 9990 letters and 10 breaks fit", () => {
    // 990 + 10 × 900 = 9990 letters in 11 lines, so 10 breaks.
    const lines = ["а".repeat(990), ...Array.from({ length: 10 }, () => "б".repeat(900))];
    const parsed = poemFormSchema.parse({ ...VALID, text: lines.join("\r\n") });

    expect(parsed.text).toBe(lines.join("\n"));
    expect([...parsed.text]).toHaveLength(TEXT_MAX_LENGTH);
  });

  it("turns a lone \\r into \\n", () => {
    expect(poemFormSchema.parse({ ...VALID, text: "один\rдва" }).text).toBe("один\nдва");
  });

  it("removes leading empty lines and trailing whitespace but keeps the first line's indent", () => {
    const parsed = poemFormSchema.parse({ ...VALID, text: `\n  \r\n${INDENT_STEP}строка\nещё строка  \n\n` });

    expect(parsed.text).toBe(`${INDENT_STEP}строка\nещё строка`);
  });

  it("maps «Без жанра» to null and keeps any other genre id", () => {
    expect(poemFormSchema.parse({ ...VALID, genreId: NO_GENRE }).genreId).toBeNull();
    expect(poemFormSchema.parse(VALID).genreId).toBe(GENRE_ID);
  });
});

describe("toPoemFieldErrors", () => {
  it("keeps the first message per field and ignores paths that are no form field", () => {
    const error = new z.ZodError([
      { code: "custom", message: "first", path: ["title"], input: "" },
      { code: "custom", message: "second", path: ["title"], input: "" },
      { code: "custom", message: "elsewhere", path: ["other"], input: "" },
      { code: "custom", message: "no path", path: [], input: "" },
    ]);

    expect(toPoemFieldErrors(error)).toEqual({ title: "first" });
  });
});

describe("ownPoemPath", () => {
  it("is the poem's page under /account/poems", () => {
    expect(ownPoemPath("abc")).toBe("/account/poems/abc");
  });
});

import { describe, expect, it } from "vitest";

import {
  collectionFormSchema,
  isCollectionId,
  normalizeCollectionDescription,
  normalizeCollectionTitle,
  toCollectionFieldErrors,
} from "../../model/collection-form.schema";
import { COLLECTION_FIELD_ERRORS } from "../../model/collection-management-messages";
import {
  COLLECTION_DESCRIPTION_MAX_LENGTH,
  COLLECTION_TITLE_MAX_LENGTH,
} from "../../model/collection-management.constants";

/** One astral character: two UTF-16 units, one code point, as the database's `char_length` counts it. */
const ASTRAL = "😀";

const COLLECTION_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";

function errorsOf(input: { title: string; description: string }): ReturnType<typeof toCollectionFieldErrors> {
  const result = collectionFormSchema.safeParse(input);
  return result.success ? {} : toCollectionFieldErrors(result.error);
}

describe("normalizeCollectionTitle / normalizeCollectionDescription", () => {
  it("trims the title and turns CRLF and lone CR into LF", () => {
    expect(normalizeCollectionTitle("  Осенний цикл \r\n")).toBe("Осенний цикл");
    expect(normalizeCollectionDescription(" a\r\nb\rc ")).toBe("a\nb\nc");
  });

  // implements FR-3 of add-poem-collections
  it("turns a blank description into null", () => {
    expect(normalizeCollectionDescription("")).toBeNull();
    expect(normalizeCollectionDescription(" \r\n\t ")).toBeNull();
  });
});

describe("collectionFormSchema", () => {
  // implements FR-3 of add-poem-collections
  it("returns the stored values: trimmed title, trimmed description or null", () => {
    expect(collectionFormSchema.parse({ title: " Осенний цикл ", description: " Стихи октября " })).toEqual({
      title: "Осенний цикл",
      description: "Стихи октября",
    });
    expect(collectionFormSchema.parse({ title: "Весна", description: "   " })).toEqual({
      title: "Весна",
      description: null,
    });
  });

  // implements FR-3 of add-poem-collections
  it.each([
    ["empty", ""],
    ["spaces only", "   "],
    ["line breaks only", "\r\n\n"],
  ])("requires a title (%s)", (_case, title) => {
    expect(errorsOf({ title, description: "" })).toEqual({ title: COLLECTION_FIELD_ERRORS.required });
  });

  // implements FR-3 of add-poem-collections
  it("counts the title's limit in code points after trimming", () => {
    const atLimit = ASTRAL.repeat(COLLECTION_TITLE_MAX_LENGTH);
    expect(errorsOf({ title: `  ${atLimit}  `, description: "" })).toEqual({});
    expect(errorsOf({ title: `${atLimit}a`, description: "" })).toEqual({ title: COLLECTION_FIELD_ERRORS.titleTooLong });
  });

  // implements FR-3 of add-poem-collections
  it("counts the description's limit in code points after CRLF normalization and trimming", () => {
    // Each CRLF is one character once normalized, so this is exactly the limit.
    const atLimit = `${"a".repeat(COLLECTION_DESCRIPTION_MAX_LENGTH - 2)}\r\n${ASTRAL}`;
    expect(errorsOf({ title: "Весна", description: ` ${atLimit} ` })).toEqual({});
    expect(errorsOf({ title: "Весна", description: `${atLimit}b` })).toEqual({
      description: COLLECTION_FIELD_ERRORS.descriptionTooLong,
    });
  });

  // implements FR-3 of add-poem-collections
  it("reports both fields' errors at once", () => {
    expect(
      errorsOf({
        title: "a".repeat(COLLECTION_TITLE_MAX_LENGTH + 1),
        description: "a".repeat(COLLECTION_DESCRIPTION_MAX_LENGTH + 1),
      }),
    ).toEqual({
      title: COLLECTION_FIELD_ERRORS.titleTooLong,
      description: COLLECTION_FIELD_ERRORS.descriptionTooLong,
    });
  });

  it("ignores extra keys such as the collection id", () => {
    expect(collectionFormSchema.parse({ collectionId: COLLECTION_ID, title: "Весна", description: "" })).toEqual({
      title: "Весна",
      description: null,
    });
  });
});

describe("isCollectionId", () => {
  it("accepts the lowercase UUID spelling the database returns", () => {
    expect(isCollectionId(COLLECTION_ID)).toBe(true);
  });

  it.each([
    ["uppercase", COLLECTION_ID.toUpperCase()],
    ["junk", "abc"],
    ["empty", ""],
    ["padded", ` ${COLLECTION_ID}`],
    ["a path", `${COLLECTION_ID}/edit`],
  ])("rejects %s", (_case, id) => {
    expect(isCollectionId(id)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import { isCollectionFormChanged } from "../../model/collection-form-values";

const STORED = { title: "Осенний цикл", description: "Стихи октября\nи ноября" } as const;
const STORED_WITHOUT_DESCRIPTION = { title: "Весна", description: "" } as const;

describe("isCollectionFormChanged", () => {
  // implements FR-8 of add-poem-collections
  it.each([
    ["the same values", STORED],
    ["a trailing space in the title", { ...STORED, title: `${STORED.title} ` }],
    ["leading spaces in the description", { ...STORED, description: `  ${STORED.description}` }],
    ["CRLF instead of LF", { ...STORED, description: "Стихи октября\r\nи ноября" }],
  ])("is unchanged for %s", (_case, draft) => {
    expect(isCollectionFormChanged(STORED, draft)).toBe(false);
  });

  // implements FR-8 of add-poem-collections
  it("reads a blank description as none, so spaces in an empty description are no change", () => {
    expect(isCollectionFormChanged(STORED_WITHOUT_DESCRIPTION, { ...STORED_WITHOUT_DESCRIPTION, description: "  \n " })).toBe(
      false,
    );
  });

  // implements FR-8 of add-poem-collections
  it.each([
    ["a new title", { ...STORED, title: "Осенний цикл 2026" }],
    ["a new description", { ...STORED, description: "Без посвящений" }],
    ["a cleared description", { ...STORED, description: "   " }],
    ["a changed line break", { ...STORED, description: "Стихи октября и ноября" }],
  ])("is changed for %s", (_case, draft) => {
    expect(isCollectionFormChanged(STORED, draft)).toBe(true);
  });
});

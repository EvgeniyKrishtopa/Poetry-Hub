import { describe, expect, it } from "vitest";

import { PUBLIC_COLLECTIONS_COPY, PUBLIC_COLLECTIONS_LOADING_LABEL } from "../../model/public-collections-messages";

describe("public collections messages", () => {
  // implements NFR-8 of public-collections
  it("match the proposal's UI copy table verbatim", () => {
    expect(PUBLIC_COLLECTIONS_COPY).toEqual({
      sectionHeading: "Сборники произведений",
      sectionUnavailable: "Сборники сейчас недоступны.",
      poemsHeading: "Произведения",
    });
  });

  // implements NFR-8 of public-collections
  it("announces loading with the same wording as the poem page", () => {
    expect(PUBLIC_COLLECTIONS_LOADING_LABEL).toBe("Загрузка…");
  });
});

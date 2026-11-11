import { describe, expect, it } from "vitest";

import { PUBLIC_COLLECTIONS_COPY } from "../../model/public-collections-messages";

describe("public collections messages", () => {
  // implements NFR-8 of public-collections
  it("match the proposal's UI copy table verbatim", () => {
    expect(PUBLIC_COLLECTIONS_COPY).toEqual({
      sectionHeading: "Сборники произведений",
      sectionUnavailable: "Сборники сейчас недоступны.",
      poemsHeading: "Произведения",
    });
  });
});

import { describe, expect, it } from "vitest";

import {
  formatGenreLine,
  getIllustrationAlt,
  NO_POEMS_TEXT,
  POEMS_LOADING_LABEL,
  POEMS_PAGE_TITLE,
  POEMS_UNAVAILABLE_TEXT,
} from "../../model/poems-messages";

describe("poems messages", () => {
  // implements NFR-7 of add-author-poems
  // implements NFR-8 of add-poem-creation
  it("match the proposal's UI copy table verbatim", () => {
    expect(NO_POEMS_TEXT).toBe("У автора пока ещё нет публикаций.");
    expect(POEMS_PAGE_TITLE).toBe("Произведения");
    expect(POEMS_UNAVAILABLE_TEXT).toBe("Произведения сейчас недоступны.");
  });

  it("announce loading with the root loading screen's text", () => {
    expect(POEMS_LOADING_LABEL).toBe("Загрузка…");
  });

  // implements FR-4, NFR-7 of add-author-poems
  it("build the illustration alt text and the genre line", () => {
    expect(getIllustrationAlt("Осенний сад")).toBe("Иллюстрация: Осенний сад");
    expect(formatGenreLine("Лирика")).toBe("Жанр: Лирика");
  });
});

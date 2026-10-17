import { describe, expect, it } from "vitest";

import { formatAboutCounter, getPhotoAlt, getProfileFailureMessage } from "../../model/author-messages";

describe("author messages", () => {
  // implements FR-9, NFR-8 of add-author-profiles
  it.each([
    ["unauthenticated", "Сессия истекла. Войдите снова."],
    ["unavailable", "Сохранение сейчас недоступно. Попробуйте позже."],
    ["unknown", "Что-то пошло не так. Попробуйте ещё раз."],
  ] as const)("maps %s to its Russian message", (failure, message) => {
    expect(getProfileFailureMessage(failure)).toBe(message);
  });

  // implements FR-21, NFR-8 of add-author-profiles
  it.each([
    ["too-many-saves", "Слишком много сохранений. Попробуйте через минуту."],
    ["too-many-uploads", "Слишком много загрузок фото. Попробуйте через час."],
  ] as const)("maps the write-limit failure %s to its Russian message", (failure, message) => {
    expect(getProfileFailureMessage(failure)).toBe(message);
  });

  // implements FR-11 of add-author-profiles
  it("formats the about counter against 1000, also over the limit", () => {
    expect(formatAboutCounter(2)).toBe("2 / 1000");
    expect(formatAboutCounter(1012)).toBe("1012 / 1000");
  });

  // implements NFR-5 of add-author-profiles
  it("builds the photo alt text from the full name", () => {
    expect(getPhotoAlt("Anna Akhmatova")).toBe("Фото: Anna Akhmatova");
  });
});

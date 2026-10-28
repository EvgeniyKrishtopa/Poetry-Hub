import { describe, expect, it } from "vitest";

import { getPhotoAlt, getProfileFailureMessage } from "../../model/author-messages";

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

  // implements NFR-5 of add-author-profiles
  it("builds the photo alt text from the full name", () => {
    expect(getPhotoAlt("Anna Akhmatova")).toBe("Фото: Anna Akhmatova");
  });
});

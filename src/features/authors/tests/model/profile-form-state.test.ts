import { describe, expect, it } from "vitest";

import type { AuthorProfile, FieldFormState, ProfileActionResponse } from "../../model/author.types";
import { getFieldErrorMessage, toFieldFormState } from "../../model/profile-form-state";

const DRAFT = { about: "**Поэт**", align: "center" } as const;

const PROFILE: AuthorProfile = {
  id: "1b9d6bcd-bbfd-4b2d-9b5d-ab8dfbbd4bed",
  firstName: "Anna",
  lastName: null,
  about: null,
  aboutAlign: "left",
  photoUrl: null,
};

describe("toFieldFormState", () => {
  // implements FR-7, FR-9 of add-author-profiles
  it.each<[string, ProfileActionResponse, FieldFormState<typeof DRAFT>]>([
    ["saved", { data: { status: "saved", profile: PROFILE } }, { status: "saved" }],
    ["saved with no profile left", { data: { status: "saved", profile: null } }, { status: "saved" }],
    [
      "a field validation error",
      { validationErrors: { formErrors: [], fieldErrors: { about: ["Не более 1000 символов."] } } },
      { status: "invalid", draft: DRAFT, error: "Не более 1000 символов." },
    ],
    [
      "the first field that has an error",
      {
        validationErrors: {
          formErrors: [],
          fieldErrors: { about: [], align: ["Недопустимое выравнивание."] },
        },
      },
      { status: "invalid", draft: DRAFT, error: "Недопустимое выравнивание." },
    ],
    [
      "a form-level validation error",
      { validationErrors: { formErrors: ["Обязательное поле."], fieldErrors: {} } },
      { status: "invalid", draft: DRAFT, error: "Обязательное поле." },
    ],
    [
      "validation errors with no message",
      { validationErrors: { formErrors: [], fieldErrors: {} } },
      { status: "failed", draft: DRAFT, failure: "unknown" },
    ],
    [
      "a serverError (unexpected throw)",
      { serverError: "Что-то пошло не так. Попробуйте ещё раз." },
      { status: "failed", draft: DRAFT, failure: "unknown" },
    ],
    ["no data at all", {}, { status: "failed", draft: DRAFT, failure: "unknown" }],
    [
      "an unauthenticated failure",
      { data: { status: "failed", failure: "unauthenticated" } },
      { status: "failed", draft: DRAFT, failure: "unauthenticated" },
    ],
    [
      "an unavailable failure",
      { data: { status: "failed", failure: "unavailable" } },
      { status: "failed", draft: DRAFT, failure: "unavailable" },
    ],
  ])("maps %s", (_case, response, expected) => {
    expect(toFieldFormState(response, DRAFT)).toEqual(expected);
  });

  it("keeps the submitted draft on failure", () => {
    const state = toFieldFormState({ data: { status: "failed", failure: "unknown" } }, DRAFT);

    expect(state).toMatchObject({ draft: DRAFT });
  });
});

describe("getFieldErrorMessage", () => {
  // implements FR-8, FR-9 of add-author-profiles
  it.each<[string, FieldFormState<string>, string | undefined]>([
    ["idle", { status: "idle" }, undefined],
    ["saved", { status: "saved" }, undefined],
    ["invalid", { status: "invalid", draft: "", error: "Обязательное поле." }, "Обязательное поле."],
    ["failed", { status: "failed", draft: "", failure: "unavailable" }, "Сохранение сейчас недоступно. Попробуйте позже."],
  ])("%s", (_label, state, expected) => {
    expect(getFieldErrorMessage(state)).toBe(expected);
  });
});

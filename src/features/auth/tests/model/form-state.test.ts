import { describe, expect, it } from "vitest";

import type {
  AuthActionResult,
  AuthFailure,
  RecoveryRequestResult,
  ResetPasswordFormState,
  SignInFormState,
  SignInResult,
  SignUpFormState,
  SignUpResult,
  UpdatePasswordResult,
} from "../../model/auth.types";
import {
  readCredentials,
  readNewPassword,
  toRecoveryRequestResult,
  toResetPasswordFormState,
  toSignInFormState,
  toSignUpFormState,
} from "../../model/form-state";

const EMAIL = "reader@example.com";
const PASSWORD = "secret-password-1";

const validationErrors = {
  formErrors: [],
  fieldErrors: { email: ["Введите корректный адрес электронной почты.", "second"], password: ["Введите пароль."] },
};

const FAILURES: readonly AuthFailure[] = [
  "invalid-credentials",
  "email-not-confirmed",
  "rate-limited",
  "unavailable",
  "unknown",
];

function expectNoPassword(state: unknown) {
  expect(JSON.stringify(state)).not.toContain(PASSWORD);
}

describe("toSignInFormState", () => {
  // implements FR-2 of add-supabase-auth
  it.each<[string, AuthActionResult<SignInResult>, SignInFormState]>([
    [
      "validationErrors",
      { validationErrors },
      {
        status: "invalid",
        email: EMAIL,
        fieldErrors: { email: "Введите корректный адрес электронной почты.", password: "Введите пароль." },
      },
    ],
    ["serverError", { serverError: "Что-то пошло не так. Попробуйте ещё раз." }, { status: "failed", email: EMAIL, failure: "unknown" }],
    ["an empty result", {}, { status: "failed", email: EMAIL, failure: "unknown" }],
    ...FAILURES.map((failure): [string, AuthActionResult<SignInResult>, SignInFormState] => [
      `data.failure ${failure}`,
      { data: { status: "failed", failure } },
      { status: "failed", email: EMAIL, failure },
    ]),
  ])("%s → expected state", (_label, result, expected) => {
    const state = toSignInFormState(result, EMAIL);

    expect(state).toEqual(expected);
    expectNoPassword(state);
  });
});

describe("toSignUpFormState", () => {
  // implements FR-4 of add-supabase-auth
  it.each<[string, AuthActionResult<SignUpResult>, SignUpFormState]>([
    [
      "validationErrors",
      { validationErrors: { formErrors: [], fieldErrors: { password: ["Не менее 8 символов."] } } },
      { status: "invalid", email: EMAIL, fieldErrors: { password: "Не менее 8 символов." } },
    ],
    ["serverError", { serverError: "Что-то пошло не так. Попробуйте ещё раз." }, { status: "failed", email: EMAIL, failure: "unknown" }],
    ["check-email", { data: { status: "check-email", email: EMAIL } }, { status: "check-email", email: EMAIL }],
    [
      "weak-password",
      { data: { status: "failed", failure: "weak-password" } },
      { status: "invalid", email: EMAIL, fieldErrors: { password: "Придумайте пароль надёжнее." } },
    ],
    ...FAILURES.map((failure): [string, AuthActionResult<SignUpResult>, SignUpFormState] => [
      `data.failure ${failure}`,
      { data: { status: "failed", failure } },
      { status: "failed", email: EMAIL, failure },
    ]),
  ])("%s → expected state", (_label, result, expected) => {
    const state = toSignUpFormState(result, EMAIL);

    expect(state).toEqual(expected);
    expectNoPassword(state);
  });
});

describe("readCredentials", () => {
  // implements NFR-1 of add-supabase-auth
  it("reads email and password from the form data", () => {
    const formData = new FormData();
    formData.set("email", EMAIL);
    formData.set("password", PASSWORD);

    expect(readCredentials(formData)).toEqual({ email: EMAIL, password: PASSWORD });
  });

  it("reads missing or non-string fields as empty strings", () => {
    const formData = new FormData();
    formData.set("password", new Blob(["x"]));

    expect(readCredentials(formData)).toEqual({ email: "", password: "" });
  });
});

describe("toRecoveryRequestResult", () => {
  // implements FR-2 of password-recovery
  it.each<[string, AuthActionResult<RecoveryRequestResult>, RecoveryRequestResult]>([
    ["sent", { data: { status: "sent" } }, { status: "sent" }],
    ["a failure", { data: { status: "failed", failure: "rate-limited" } }, { status: "failed", failure: "rate-limited" }],
    ["a rejected address", { validationErrors: { formErrors: [], fieldErrors: { email: ["x"] } } }, { status: "invalid" }],
    ["a serverError", { serverError: "boom" }, { status: "failed", failure: "unknown" }],
    ["an empty result", {}, { status: "failed", failure: "unknown" }],
  ])("reads %s", (_label, result, expected) => {
    expect(toRecoveryRequestResult(result)).toEqual(expected);
  });
});

describe("toResetPasswordFormState and readNewPassword", () => {
  const SHORT = "Не менее 8 символов.";

  // implements FR-5, FR-8 of password-recovery
  it.each<[string, AuthActionResult<UpdatePasswordResult>, ResetPasswordFormState]>([
    [
      "a short password",
      { validationErrors: { formErrors: [], fieldErrors: { password: [SHORT, "second"] } } },
      { status: "invalid", fieldError: SHORT },
    ],
    [
      "a weak password",
      { data: { status: "failed", failure: "weak-password" } },
      { status: "invalid", fieldError: "Придумайте пароль надёжнее." },
    ],
    [
      "the same password",
      { data: { status: "failed", failure: "same-password" } },
      { status: "invalid", fieldError: "Новый пароль должен отличаться от прежнего." },
    ],
    ["the limit", { data: { status: "failed", failure: "rate-limited" } }, { status: "failed", failure: "rate-limited" }],
    ["an ended session", { data: { status: "failed", failure: "link-expired" } }, { status: "failed", failure: "link-expired" }],
    ["a serverError", { serverError: "boom" }, { status: "failed", failure: "unknown" }],
    ["an empty result", {}, { status: "failed", failure: "unknown" }],
    [
      "validation errors without a password message",
      { validationErrors: { formErrors: ["x"], fieldErrors: {} } },
      { status: "failed", failure: "unknown" },
    ],
  ])("reads %s", (_label, result, expected) => {
    expect(toResetPasswordFormState(result)).toEqual(expected);
  });

  it("reads only the password entry of the form data", () => {
    const formData = new FormData();
    formData.set("password", PASSWORD);
    formData.set("email", EMAIL);

    expect(readNewPassword(formData)).toEqual({ password: PASSWORD });
    expect(readNewPassword(new FormData())).toEqual({ password: "" });
  });
});

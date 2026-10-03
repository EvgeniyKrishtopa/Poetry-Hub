import { describe, expect, it } from "vitest";

import type {
  AuthActionResult,
  AuthFailure,
  SignInFormState,
  SignInResult,
  SignUpFormState,
  SignUpResult,
} from "../../model/auth.types";
import { toSignInFormState, toSignUpFormState } from "../../model/form-state";

const EMAIL = "reader@example.com";
const PASSWORD = "secret-password-1";

const validationErrors = {
  formErrors: [],
  fieldErrors: { email: ["Enter a valid email address.", "second"], password: ["Enter your password."] },
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
        fieldErrors: { email: "Enter a valid email address.", password: "Enter your password." },
      },
    ],
    ["serverError", { serverError: "Something went wrong. Try again." }, { status: "failed", email: EMAIL, failure: "unknown" }],
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
      { validationErrors: { formErrors: [], fieldErrors: { password: ["Use at least 8 characters."] } } },
      { status: "invalid", email: EMAIL, fieldErrors: { password: "Use at least 8 characters." } },
    ],
    ["serverError", { serverError: "Something went wrong. Try again." }, { status: "failed", email: EMAIL, failure: "unknown" }],
    ["check-email", { data: { status: "check-email", email: EMAIL } }, { status: "check-email", email: EMAIL }],
    [
      "weak-password",
      { data: { status: "failed", failure: "weak-password" } },
      { status: "invalid", email: EMAIL, fieldErrors: { password: "Choose a stronger password." } },
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

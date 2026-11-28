import { describe, expect, it } from "vitest";

import { FIELD_MESSAGES } from "../../model/auth-messages";
import { confirmParamsSchema, recoveryParamsSchema } from "../../model/confirm-params.schema";
import { MIN_PASSWORD_LENGTH } from "../../model/auth.constants";
import {
  newPasswordSchema,
  recoveryRequestSchema,
  signInSchema,
  signUpSchema,
} from "../../model/credentials.schema";

const VALID_EMAIL = "reader@example.com";

function fieldErrors(result: { success: boolean; error?: { issues: { path: PropertyKey[]; message: string }[] } }) {
  return Object.fromEntries((result.error?.issues ?? []).map((issue) => [String(issue.path[0]), issue.message]));
}

describe("signInSchema", () => {
  // implements FR-2 of add-supabase-auth
  it("accepts a valid email and any non-empty password", () => {
    expect(signInSchema.safeParse({ email: VALID_EMAIL, password: "x" }).success).toBe(true);
  });

  it("rejects an invalid email and an empty password with their field messages", () => {
    const result = signInSchema.safeParse({ email: "not-an-email", password: "" });

    expect(result.success).toBe(false);
    expect(fieldErrors(result)).toEqual({
      email: FIELD_MESSAGES.emailInvalid,
      password: FIELD_MESSAGES.passwordRequired,
    });
  });

  it("rejects missing fields with the same messages", () => {
    expect(fieldErrors(signInSchema.safeParse({}))).toEqual({
      email: FIELD_MESSAGES.emailInvalid,
      password: FIELD_MESSAGES.passwordRequired,
    });
  });
});

/** Holds one of each required kind and is exactly the minimum long. */
const STRONG_PASSWORD = "Abcdefghij1!";

describe("signUpSchema", () => {
  const tooShort = STRONG_PASSWORD.slice(1);
  const longEnough = STRONG_PASSWORD;

  // implements FR-4 of pre-deploy-security-hardening
  it("uses a 12-character minimum", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(12);
    expect(STRONG_PASSWORD).toHaveLength(MIN_PASSWORD_LENGTH);
  });

  // implements FR-4 of pre-deploy-security-hardening
  it.each([
    ["a lowercase letter", "ABCDEFGHIJ1!"],
    ["an uppercase letter", "abcdefghij1!"],
    ["a digit", "Abcdefghijk!"],
    ["a special character", "Abcdefghijk1"],
    ["Latin letters", "Пароль-Пароль-1!"],
  ])("refuses a long password without %s, naming what it needs", (_label, password) => {
    const result = signUpSchema.safeParse({ email: VALID_EMAIL, password });

    expect(fieldErrors(result)).toEqual({ password: FIELD_MESSAGES.passwordTooSimple });
  });

  // implements FR-4 of pre-deploy-security-hardening
  it.each(["-", "\\", "]", "[", "`", "~", '"', "'"])("counts %s as a special character", (symbol) => {
    const result = signUpSchema.safeParse({ email: VALID_EMAIL, password: `Abcdefghij1${symbol}` });

    expect(result.success).toBe(true);
  });

  // implements FR-4 of pre-deploy-security-hardening
  it("allows other characters besides the required ones", () => {
    expect(signUpSchema.safeParse({ email: VALID_EMAIL, password: "Мой стих Ab1!" }).success).toBe(true);
  });

  it(`accepts a password of exactly ${MIN_PASSWORD_LENGTH} characters`, () => {
    expect(signUpSchema.safeParse({ email: VALID_EMAIL, password: longEnough }).success).toBe(true);
  });

  it("rejects a password one character short with a message naming the minimum", () => {
    const result = signUpSchema.safeParse({ email: VALID_EMAIL, password: tooShort });

    expect(result.success).toBe(false);
    expect(fieldErrors(result).password).toContain(String(MIN_PASSWORD_LENGTH));
  });

  it("rejects an invalid email", () => {
    expect(fieldErrors(signUpSchema.safeParse({ email: "nope", password: longEnough }))).toEqual({
      email: FIELD_MESSAGES.emailInvalid,
    });
  });
});

describe("confirmParamsSchema", () => {
  // implements FR-5 of add-supabase-auth
  it("accepts a non-empty hash with type email", () => {
    expect(confirmParamsSchema.safeParse({ token_hash: "abc", type: "email" }).success).toBe(true);
  });

  it.each([
    ["a missing hash", { type: "email" }],
    ["an empty hash", { token_hash: "", type: "email" }],
    ["type=recovery", { token_hash: "abc", type: "recovery" }],
    ["a missing type", { token_hash: "abc" }],
  ])("rejects %s", (_label, input) => {
    expect(confirmParamsSchema.safeParse(input).success).toBe(false);
  });
});

describe("recoveryRequestSchema", () => {
  // implements FR-2 of password-recovery
  it("accepts a valid email and keeps only it", () => {
    const result = recoveryRequestSchema.safeParse({ email: VALID_EMAIL, password: "typed-but-ignored" });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ email: VALID_EMAIL });
  });

  it.each([
    ["an invalid address", { email: "not-an-email" }],
    ["an empty address", { email: "" }],
    ["a missing address", {}],
  ])("rejects %s with the email field message", (_label, input) => {
    const result = recoveryRequestSchema.safeParse(input);

    expect(result.success).toBe(false);
    expect(fieldErrors(result)).toEqual({ email: FIELD_MESSAGES.emailInvalid });
  });
});

describe("newPasswordSchema", () => {
  const tooShort = STRONG_PASSWORD.slice(1);
  const longEnough = STRONG_PASSWORD;

  // implements FR-5 of password-recovery
  it(`accepts a password of exactly ${MIN_PASSWORD_LENGTH} characters`, () => {
    expect(newPasswordSchema.safeParse({ password: longEnough }).success).toBe(true);
  });

  it.each([
    ["a short password", { password: tooShort }],
    ["an empty password", { password: "" }],
    ["a missing password", {}],
  ])("rejects %s with the sign-up rule's message", (_label, input) => {
    const result = newPasswordSchema.safeParse(input);

    expect(result.success).toBe(false);
    expect(fieldErrors(result)).toEqual({ password: FIELD_MESSAGES.passwordTooShort(MIN_PASSWORD_LENGTH) });
  });
});

describe("recoveryParamsSchema", () => {
  // implements FR-3 of password-recovery
  it("accepts a non-empty hash with type recovery", () => {
    expect(recoveryParamsSchema.safeParse({ token_hash: "abc", type: "recovery" }).success).toBe(true);
  });

  it.each([
    ["a missing hash", { type: "recovery" }],
    ["an empty hash", { token_hash: "", type: "recovery" }],
    ["type=email", { token_hash: "abc", type: "email" }],
    ["a missing type", { token_hash: "abc" }],
  ])("rejects %s", (_label, input) => {
    expect(recoveryParamsSchema.safeParse(input).success).toBe(false);
  });
});

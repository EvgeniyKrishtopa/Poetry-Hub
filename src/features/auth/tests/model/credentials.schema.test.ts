import { describe, expect, it } from "vitest";

import { FIELD_MESSAGES } from "../../model/auth-messages";
import { confirmParamsSchema } from "../../model/confirm-params.schema";
import { MIN_PASSWORD_LENGTH, signInSchema, signUpSchema } from "../../model/credentials.schema";

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

describe("signUpSchema", () => {
  const tooShort = "a".repeat(MIN_PASSWORD_LENGTH - 1);
  const longEnough = "a".repeat(MIN_PASSWORD_LENGTH);

  // implements FR-4 of add-supabase-auth
  it("uses an 8-character minimum", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
  });

  it(`accepts a password of exactly ${MIN_PASSWORD_LENGTH} characters`, () => {
    expect(signUpSchema.safeParse({ email: VALID_EMAIL, password: longEnough }).success).toBe(true);
  });

  it(`rejects a ${MIN_PASSWORD_LENGTH - 1}-character password with a message naming the minimum`, () => {
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

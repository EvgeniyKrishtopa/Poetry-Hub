import { describe, expect, it } from "vitest";

import { NEW_ACCOUNT_WINDOW_MS } from "../../model/auth.constants";
import { didAccountExist } from "../../model/did-account-exist";

const CREATED_AT = "2026-11-24T10:00:00.000Z";
const CREATED_AT_MS = Date.parse(CREATED_AT);
const MS_PER_DAY = 86_400_000;

function signedInAfter(gapMs: number): string {
  const lastSignInAt = new Date(CREATED_AT_MS + gapMs);
  return lastSignInAt.toISOString();
}

describe("didAccountExist", () => {
  it("is 60 seconds", () => {
    expect(NEW_ACCOUNT_WINDOW_MS).toBe(60_000);
  });

  // implements FR-G3 of google-sign-in
  it("reads a sign-in milliseconds after creation as a new account (task 1.2 (e): 53 ms)", () => {
    const lastSignInAt = signedInAfter(53);

    expect(didAccountExist({ created_at: CREATED_AT, last_sign_in_at: lastSignInAt })).toBe(false);
  });

  // implements FR-G6 of google-sign-in
  it("reads a returning user as an existing account (task 1.2 (e): 107 s)", () => {
    const lastSignInAt = signedInAfter(107_000);

    expect(didAccountExist({ created_at: CREATED_AT, last_sign_in_at: lastSignInAt })).toBe(true);
  });

  // implements FR-G6 of google-sign-in
  it("reads an old account with a fresh sign-in as existing (an unconfirmed password sign-up long ago)", () => {
    const lastSignInAt = signedInAfter(30 * MS_PER_DAY);

    expect(didAccountExist({ created_at: CREATED_AT, last_sign_in_at: lastSignInAt })).toBe(true);
  });

  it.each([
    ["exactly the window", NEW_ACCOUNT_WINDOW_MS, false],
    ["one millisecond over the window", NEW_ACCOUNT_WINDOW_MS + 1, true],
    ["one millisecond under the window", NEW_ACCOUNT_WINDOW_MS - 1, false],
  ])("at %s reads existing = %s", (_label, gapMs, expected) => {
    const lastSignInAt = signedInAfter(gapMs);

    expect(didAccountExist({ created_at: CREATED_AT, last_sign_in_at: lastSignInAt })).toBe(expected);
  });

  it("reads a user with no last sign-in as new", () => {
    expect(didAccountExist({ created_at: CREATED_AT })).toBe(false);
  });

  it("reads unreadable timestamps as new", () => {
    expect(didAccountExist({ created_at: "not a date", last_sign_in_at: CREATED_AT })).toBe(false);
  });
});

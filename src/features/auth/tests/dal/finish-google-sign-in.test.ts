// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { finishGoogleSignIn } from "../../dal/finish-google-sign-in";
import type { GoogleCallbackParams } from "../../model/auth.types";

vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

const CODE = "0b6c1f2e-9a7d-4c3b-8e5f-1a2b3c4d5e6f";
const EMAIL = "reader@example.com";
const ACCESS_TOKEN = "eyJhbGciOiJIUzI1NiJ9.access.token";
const CREATED_AT = "2026-11-24T10:00:00.000Z";
const JUST_AFTER_CREATION = "2026-11-24T10:00:00.053Z";
const DAYS_LATER = "2026-12-01T10:00:00.000Z";

const NO_PARAMS: GoogleCallbackParams = { code: null, error: null, errorCode: null, errorDescription: null };
const WITH_CODE: GoogleCallbackParams = { ...NO_PARAMS, code: CODE };

const exchangeCodeForSession = vi.fn();

function exchangeSucceeds(lastSignInAt: string): void {
  const user = { id: "user-1", email: EMAIL, created_at: CREATED_AT, last_sign_in_at: lastSignInAt };
  exchangeCodeForSession.mockResolvedValue({
    data: { user, session: { access_token: ACCESS_TOKEN, user } },
    error: null,
  });
}

function exchangeFails(code: string | undefined, message: string): void {
  exchangeCodeForSession.mockResolvedValue({
    data: { user: null, session: null },
    error: { name: "AuthApiError", code, status: 400, message },
  });
}

function loggedText(): string {
  return JSON.stringify(vi.mocked(console.error).mock.calls);
}

describe("finishGoogleSignIn", () => {
  beforeEach(() => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: { exchangeCodeForSession },
    } as unknown as SupabaseClient);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // implements FR-G3 of google-sign-in
  it("exchanges the code and reports a new account", async () => {
    exchangeSucceeds(JUST_AFTER_CREATION);

    await expect(finishGoogleSignIn(WITH_CODE)).resolves.toEqual({ ok: true, accountExisted: false });
    expect(exchangeCodeForSession).toHaveBeenCalledExactlyOnceWith(CODE);
    expect(console.error).not.toHaveBeenCalled();
  });

  // implements FR-G6 of google-sign-in
  it("reports an existing account", async () => {
    exchangeSucceeds(DAYS_LATER);

    await expect(finishGoogleSignIn(WITH_CODE)).resolves.toEqual({ ok: true, accountExisted: true });
  });

  // implements FR-G4 of google-sign-in
  it.each([
    ["neither code nor error", NO_PARAMS],
    ["an empty code", { ...NO_PARAMS, code: "" }],
  ])("returns failed for %s without an exchange", async (_label, params) => {
    await expect(finishGoogleSignIn(params)).resolves.toEqual({ ok: false, reason: "failed" });
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[auth] google sign-in failed");
  });

  // implements FR-G4, NFR-G1 of google-sign-in
  it("returns cancelled for the recorded cancel without an exchange or a log line", async () => {
    const params = { ...NO_PARAMS, error: "access_denied", errorDescription: "" };

    await expect(finishGoogleSignIn(params)).resolves.toEqual({ ok: false, reason: "cancelled" });
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  // implements FR-G5, NFR-G1 of google-sign-in
  it.each([
    ["a blocked account", { error: "access_denied", errorCode: "user_banned", errorDescription: "User is banned" }, "[auth] google sign-in blocked: user_banned"],
    ["the hook's refusal", { error: "access_denied", errorCode: "", errorDescription: "signup not allowed" }, "[auth] google sign-in blocked"],
  ])("returns blocked for %s on the redirect, logging one line", async (_label, refusal, line) => {
    const params = { ...NO_PARAMS, ...refusal };

    await expect(finishGoogleSignIn(params)).resolves.toEqual({ ok: false, reason: "blocked" });
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledExactlyOnceWith(line);
    expect(loggedText()).not.toContain("signup not allowed");
  });

  // implements FR-G4 of google-sign-in
  it("ignores a code that comes with an error", async () => {
    const params = { ...WITH_CODE, error: "access_denied", errorCode: "provider_disabled", errorDescription: "" };

    await expect(finishGoogleSignIn(params)).resolves.toEqual({ ok: false, reason: "failed" });
    expect(exchangeCodeForSession).not.toHaveBeenCalled();
  });

  // implements FR-G5 of google-sign-in
  it("returns blocked when the exchange reports user_banned", async () => {
    exchangeFails("user_banned", "User is banned");

    await expect(finishGoogleSignIn(WITH_CODE)).resolves.toEqual({ ok: false, reason: "blocked" });
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[auth] google sign-in blocked: user_banned");
  });

  // implements FR-G4, NFR-G1 of google-sign-in
  it("returns failed for any other exchange error, logging the code and none of the text", async () => {
    exchangeFails("bad_code_verifier", `code verifier missing for ${EMAIL} and ${CODE}`);

    await expect(finishGoogleSignIn(WITH_CODE)).resolves.toEqual({ ok: false, reason: "failed" });
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[auth] google sign-in failed: bad_code_verifier");
    expect(loggedText()).not.toContain(EMAIL);
    expect(loggedText()).not.toContain(CODE);
  });

  it("returns failed for an exchange error with no code", async () => {
    exchangeFails(undefined, "Invalid token response");

    await expect(finishGoogleSignIn(WITH_CODE)).resolves.toEqual({ ok: false, reason: "failed" });
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[auth] google sign-in failed");
  });

  // implements FR-G4 of google-sign-in
  it("returns failed on a missing config, logging its class name", async () => {
    vi.mocked(createSupabaseServerClient).mockRejectedValue(new SupabaseConfigError(["NEXT_PUBLIC_SUPABASE_URL"]));

    await expect(finishGoogleSignIn(WITH_CODE)).resolves.toEqual({ ok: false, reason: "failed" });
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[auth] google sign-in failed: SupabaseConfigError");
  });

  // implements NFR-G1 of google-sign-in
  it("returns failed when the exchange throws, logging no address, code value or token", async () => {
    exchangeCodeForSession.mockRejectedValue(new TypeError(`fetch failed for ${EMAIL} ${CODE} ${ACCESS_TOKEN}`));

    await expect(finishGoogleSignIn(WITH_CODE)).resolves.toEqual({ ok: false, reason: "failed" });
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[auth] google sign-in failed: TypeError");
    expect(loggedText()).not.toContain(EMAIL);
    expect(loggedText()).not.toContain(CODE);
    expect(loggedText()).not.toContain(ACCESS_TOKEN);
  });

  it("logs the type of a thrown non-Error value", async () => {
    exchangeCodeForSession.mockRejectedValue("boom");

    await expect(finishGoogleSignIn(WITH_CODE)).resolves.toEqual({ ok: false, reason: "failed" });
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[auth] google sign-in failed: string");
  });

  // implements NFR-G1 of google-sign-in
  it("never logs an address forged into error_code", async () => {
    const params = { ...NO_PARAMS, error: "access_denied", errorCode: EMAIL, errorDescription: "" };

    await expect(finishGoogleSignIn(params)).resolves.toEqual({ ok: false, reason: "failed" });
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[auth] google sign-in failed: unrecognised");
  });
});

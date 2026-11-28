// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import {
  requestRecoveryAction,
  signInAction,
  signOutAction,
  signUpAction,
  startGoogleSignInAction,
  updatePasswordAction,
} from "../../actions/auth.actions";
import { consumePasswordResetAllowance } from "../../dal/password-reset-allowance";
import { checkRecoverySession } from "../../dal/recovery-check";
import { CAPTCHA_TOKEN_MAX_LENGTH } from "../../model/auth.constants";
import { FIELD_MESSAGES, GENERIC_SERVER_ERROR } from "../../model/auth-messages";
import type { AuthActionResult, SignInResult, SignOutResult, SignUpResult } from "../../model/auth.types";

vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("../../dal/recovery-check", () => ({ checkRecoverySession: vi.fn() }));

vi.mock("../../dal/password-reset-allowance", () => ({ consumePasswordResetAllowance: vi.fn() }));

vi.mock("next/cache", () => ({ refresh: vi.fn() }));

/** Shaped like Next's real redirect error, which next-safe-action recognizes and rethrows. */
const REDIRECT_DIGEST = "NEXT_REDIRECT;replace;/;307;";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { digest: REDIRECT_DIGEST, url });
  }),
}));

const EMAIL = "reader@example.com";
const PASSWORD = "Secret-password-1";
const CAPTCHA_TOKEN = "captcha-token-1";
const CREDENTIALS = { email: EMAIL, password: PASSWORD, captchaToken: CAPTCHA_TOKEN };
/** What the action hands Supabase for `CREDENTIALS`. */
const AUTH_CREDENTIALS = { email: EMAIL, password: PASSWORD, options: { captchaToken: CAPTCHA_TOKEN } };
const RECOVERY_INPUT = { email: EMAIL, captchaToken: CAPTCHA_TOKEN };

const auth = {
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  signInWithOAuth: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
};
const rpc = vi.fn();

function authError(code: string, status: number, message: string = code) {
  return { code, status, name: "AuthApiError", message };
}

describe("auth actions", () => {
  beforeEach(() => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ auth, rpc } as unknown as SupabaseClient);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("signInAction", () => {
    // implements FR-2 of add-supabase-auth
    it("returns validationErrors for invalid input without calling Supabase", async () => {
      const input = { email: "not-an-email", password: "", captchaToken: CAPTCHA_TOKEN };
      const result: AuthActionResult<SignInResult> = await signInAction(input);

      expect(result.validationErrors?.fieldErrors.email).toHaveLength(1);
      expect(result.validationErrors?.fieldErrors.password).toHaveLength(1);
      expect(createSupabaseServerClient).not.toHaveBeenCalled();
      expect(auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it("signs in and redirects to / on success", async () => {
      auth.signInWithPassword.mockResolvedValue({ data: {}, error: null });

      await expect(signInAction(CREDENTIALS)).rejects.toMatchObject({ digest: REDIRECT_DIGEST });
      expect(auth.signInWithPassword).toHaveBeenCalledWith(AUTH_CREDENTIALS);
      expect(redirect).toHaveBeenCalledWith("/");
    });

    // implements FR-5 of pre-deploy-security-hardening
    it.each([
      ["no captcha token", { email: EMAIL, password: PASSWORD }],
      ["an empty one", { ...CREDENTIALS, captchaToken: "" }],
      ["an oversized one", { ...CREDENTIALS, captchaToken: "x".repeat(CAPTCHA_TOKEN_MAX_LENGTH + 1) }],
    ])("refuses a call with %s before any Supabase call", async (_case, input) => {
      const result = await signInAction(input as typeof CREDENTIALS);

      expect(result.validationErrors?.fieldErrors.captchaToken).toHaveLength(1);
      expect(createSupabaseServerClient).not.toHaveBeenCalled();
      expect(auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it.each([
      ["invalid_credentials", 400, "invalid-credentials"],
      ["email_not_confirmed", 400, "email-not-confirmed"],
      ["over_request_rate_limit", 429, "rate-limited"],
      ["unexpected_failure", 500, "unknown"],
      // implements FR-16 of admin-moderation
      ["user_banned", 400, "restricted"],
      // implements FR-5 of pre-deploy-security-hardening
      ["captcha_failed", 400, "captcha"],
    ])("returns data.failure for Supabase error %s", async (code, status, failure) => {
      auth.signInWithPassword.mockResolvedValue({ data: {}, error: authError(code, status) });

      const result = await signInAction(CREDENTIALS);

      expect(result.data).toEqual({ status: "failed", failure });
      expect(redirect).not.toHaveBeenCalled();
    });

    // implements FR-8 of add-supabase-auth
    it("returns unavailable when the config is invalid", async () => {
      vi.mocked(createSupabaseServerClient).mockRejectedValue(
        new SupabaseConfigError(["NEXT_PUBLIC_SUPABASE_URL"]),
      );

      const result = await signInAction(CREDENTIALS);

      expect(result.data).toEqual({ status: "failed", failure: "unavailable" });
    });

    // implements NFR-1 of add-supabase-auth
    it("turns a throwing body into the generic serverError without echoing or logging the input", async () => {
      auth.signInWithPassword.mockRejectedValue(new TypeError(`fetch failed for ${EMAIL} / ${PASSWORD}`));

      const result = await signInAction(CREDENTIALS);

      expect(result.serverError).toBe(GENERIC_SERVER_ERROR);
      expect(JSON.stringify(result)).not.toContain(PASSWORD);
      expect(JSON.stringify(result)).not.toContain(EMAIL);
      const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
      expect(logged).not.toContain(PASSWORD);
      expect(logged).toContain("TypeError");
    });

    it("turns a non-config client creation failure into the generic serverError", async () => {
      vi.mocked(createSupabaseServerClient).mockRejectedValue(new Error("cookie store unavailable"));

      const result = await signInAction(CREDENTIALS);

      expect(result.serverError).toBe(GENERIC_SERVER_ERROR);
      expect(result.data).toBeUndefined();
    });
  });

  describe("signUpAction", () => {
    // implements FR-4 of add-supabase-auth
    it("rejects an 11-character password without calling Supabase", async () => {
      const input = { ...CREDENTIALS, password: "Abcdefghi1!" };
      const result: AuthActionResult<SignUpResult> = await signUpAction(input);

      expect(result.validationErrors?.fieldErrors.password?.[0]).toContain("12");
      expect(auth.signUp).not.toHaveBeenCalled();
    });

    // implements FR-4 of pre-deploy-security-hardening
    it("rejects a long password missing a kind of character without calling Supabase", async () => {
      const input = { ...CREDENTIALS, password: "abcdefghij1!" };
      const result: AuthActionResult<SignUpResult> = await signUpAction(input);

      expect(result.validationErrors?.fieldErrors.password?.[0]).toBe(FIELD_MESSAGES.passwordTooSimple);
      expect(auth.signUp).not.toHaveBeenCalled();
    });

    it("returns check-email on success", async () => {
      auth.signUp.mockResolvedValue({ data: { user: { identities: [{ id: "1" }] } }, error: null });

      const result = await signUpAction(CREDENTIALS);

      expect(auth.signUp).toHaveBeenCalledWith(AUTH_CREDENTIALS);
      expect(result.data).toEqual({ status: "check-email", email: EMAIL });
    });

    // implements FR-5 of pre-deploy-security-hardening
    it("refuses a call with no captcha token before any Supabase call", async () => {
      const result = await signUpAction({ email: EMAIL, password: PASSWORD } as typeof CREDENTIALS);

      expect(result.validationErrors?.fieldErrors.captchaToken).toHaveLength(1);
      expect(auth.signUp).not.toHaveBeenCalled();
    });

    it("returns the same check-email for an already-registered address (empty identities)", async () => {
      auth.signUp.mockResolvedValue({ data: { user: { identities: [] } }, error: null });

      const result = await signUpAction(CREDENTIALS);

      expect(result.data).toEqual({ status: "check-email", email: EMAIL });
    });

    it.each([
      ["weak_password", 422, "weak-password"],
      ["over_email_send_rate_limit", 429, "rate-limited"],
      ["unexpected_failure", 500, "unknown"],
      // implements FR-5 of pre-deploy-security-hardening
      ["captcha_failed", 400, "captcha"],
    ])("returns data.failure for Supabase error %s", async (code, status, failure) => {
      auth.signUp.mockResolvedValue({ data: { user: null }, error: authError(code, status) });

      const result = await signUpAction(CREDENTIALS);

      expect(result.data).toEqual({ status: "failed", failure });
    });

    // implements FR-17 of admin-moderation
    it("returns the same check-email for a banned address (the hook's rejection)", async () => {
      auth.signUp.mockResolvedValue({ data: { user: null }, error: authError("unknown", 403, "signup not allowed") });

      const result = await signUpAction(CREDENTIALS);

      expect(result.data).toEqual({ status: "check-email", email: EMAIL });
    });

    // implements NFR-6 of admin-moderation
    it("logs the refusal of a banned address without the address", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      auth.signUp.mockResolvedValue({ data: { user: null }, error: authError("unknown", 403, "signup not allowed") });

      await signUpAction(CREDENTIALS);

      expect(warn).toHaveBeenCalledExactlyOnceWith("[auth] sign-up refused for a banned address");
    });

    // implements FR-17 of admin-moderation
    it("keeps the weak-password message instead of check-email", async () => {
      auth.signUp.mockResolvedValue({
        data: { user: null },
        error: authError("weak_password", 422, "Password should be at least 8 characters"),
      });

      const result = await signUpAction(CREDENTIALS);

      expect(result.data).toEqual({ status: "failed", failure: "weak-password" });
    });

    // implements FR-8 of add-supabase-auth
    it("returns unavailable when the config is invalid", async () => {
      vi.mocked(createSupabaseServerClient).mockRejectedValue(
        new SupabaseConfigError(["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"]),
      );

      const result = await signUpAction(CREDENTIALS);

      expect(result.data).toEqual({ status: "failed", failure: "unavailable" });
    });

    // implements NFR-1 of add-supabase-auth
    it("turns a throwing body into the generic serverError without echoing the input", async () => {
      auth.signUp.mockRejectedValue(new Error(PASSWORD));

      const result = await signUpAction(CREDENTIALS);

      expect(result.serverError).toBe(GENERIC_SERVER_ERROR);
      expect(JSON.stringify(result)).not.toContain(PASSWORD);
    });
  });

  describe("requestRecoveryAction", () => {
    const SENT = { status: "sent" };

    // implements FR-2 of password-recovery
    it("returns validationErrors for an invalid address without calling Supabase", async () => {
      const result = await requestRecoveryAction({ ...RECOVERY_INPUT, email: "not-an-email" });

      expect(result.validationErrors?.fieldErrors.email).toHaveLength(1);
      expect(createSupabaseServerClient).not.toHaveBeenCalled();
      expect(auth.resetPasswordForEmail).not.toHaveBeenCalled();
    });

    // implements FR-5 of pre-deploy-security-hardening
    it("refuses a call with no captcha token before any Supabase call", async () => {
      const result = await requestRecoveryAction({ email: EMAIL } as typeof RECOVERY_INPUT);

      expect(result.validationErrors?.fieldErrors.captchaToken).toHaveLength(1);
      expect(auth.resetPasswordForEmail).not.toHaveBeenCalled();
    });

    // implements FR-2 of password-recovery
    it("receives the address and captcha token only and sends them to resetPasswordForEmail", async () => {
      auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

      const input = { ...RECOVERY_INPUT, password: PASSWORD } as typeof RECOVERY_INPUT;
      const result = await requestRecoveryAction(input);

      expect(auth.resetPasswordForEmail).toHaveBeenCalledExactlyOnceWith(EMAIL, { captchaToken: CAPTCHA_TOKEN });
      expect(result.data).toEqual(SENT);
    });

    // implements FR-2, FR-10 of password-recovery
    it("answers the same sent for an address with an account, one without, and a blocked one", async () => {
      auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

      const known = await requestRecoveryAction({ ...RECOVERY_INPUT, email: "known@example.com" });
      const unknown = await requestRecoveryAction({ ...RECOVERY_INPUT, email: "stranger@example.com" });
      const blocked = await requestRecoveryAction({ ...RECOVERY_INPUT, email: "blocked@example.com" });

      expect(known).toEqual({ data: SENT });
      expect(unknown).toEqual(known);
      expect(blocked).toEqual(known);
    });

    // implements FR-2 of password-recovery
    it("answers sent again when the reader asks again", async () => {
      auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

      await requestRecoveryAction(RECOVERY_INPUT);
      const again = await requestRecoveryAction(RECOVERY_INPUT);

      expect(auth.resetPasswordForEmail).toHaveBeenCalledTimes(2);
      expect(again.data).toEqual(SENT);
    });

    // implements FR-2 of password-recovery
    it("answers sent for the per-address refusal (code over_email_send_rate_limit, status 429), logging one line without the address", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      auth.resetPasswordForEmail.mockResolvedValue({
        data: null,
        error: authError("over_email_send_rate_limit", 429, `email rate limit exceeded for ${EMAIL}`),
      });

      const result = await requestRecoveryAction(RECOVERY_INPUT);

      expect(result.data).toEqual(SENT);
      expect(warn).toHaveBeenCalledExactlyOnceWith("[auth] recovery letter refused: email send limit");
    });

    // implements FR-2 of password-recovery
    it.each([
      ["over_request_rate_limit with 429", authError("over_request_rate_limit", 429), "rate-limited"],
      ["a bare 429 with no code", { status: 429, name: "AuthApiError", message: "slow down" }, "rate-limited"],
      ["an unlisted code with 429", authError("something_new", 429), "unknown"],
      // implements FR-5 of pre-deploy-security-hardening
      ["a rejected captcha", authError("captcha_failed", 400), "captcha"],
      ["any other error", authError("unexpected_failure", 500), "unknown"],
    ])("answers failed for %s", async (_label, error, failure) => {
      auth.resetPasswordForEmail.mockResolvedValue({ data: null, error });

      const result = await requestRecoveryAction(RECOVERY_INPUT);

      expect(result.data).toEqual({ status: "failed", failure });
    });

    // implements FR-2 of password-recovery
    it("answers unavailable when the config is invalid", async () => {
      vi.mocked(createSupabaseServerClient).mockRejectedValue(new SupabaseConfigError(["NEXT_PUBLIC_SUPABASE_URL"]));

      const result = await requestRecoveryAction(RECOVERY_INPUT);

      expect(result.data).toEqual({ status: "failed", failure: "unavailable" });
    });

    // implements FR-2 of password-recovery
    it("turns a throwing body into the generic serverError", async () => {
      auth.resetPasswordForEmail.mockRejectedValue(new TypeError(`fetch failed for ${EMAIL}`));

      const result = await requestRecoveryAction(RECOVERY_INPUT);

      expect(result.serverError).toBe(GENERIC_SERVER_ERROR);
      expect(result.data).toBeUndefined();
    });

    // implements FR-9 of password-recovery
    it("never counts an attempt of its own: the letter is limited by Supabase alone", async () => {
      auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

      await requestRecoveryAction(RECOVERY_INPUT);

      expect(consumePasswordResetAllowance).not.toHaveBeenCalled();
      expect(rpc).not.toHaveBeenCalled();
    });

    // implements NFR-1 of password-recovery
    it.each([
      ["a swallowed refusal", authError("over_email_send_rate_limit", 429, EMAIL)],
      ["a failure", authError("unexpected_failure", 500, EMAIL)],
    ])("logs nothing that holds the address after %s", async (_label, error) => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      auth.resetPasswordForEmail.mockResolvedValue({ data: null, error });

      await requestRecoveryAction(RECOVERY_INPUT);

      const logged = JSON.stringify([...vi.mocked(console.error).mock.calls, ...warn.mock.calls]);
      expect(logged).not.toContain(EMAIL);
    });
  });

  describe("updatePasswordAction", () => {
    const NEW_PASSWORD = "Correct-horse-battery-1";
    const UPDATED_TARGET = "/reset-password?status=updated";
    const SIGN_OUT_FAILED_TARGET = "/reset-password?status=updated-sign-out-failed";

    beforeEach(() => {
      vi.mocked(checkRecoverySession).mockResolvedValue("recovery");
      vi.mocked(consumePasswordResetAllowance).mockResolvedValue("allowed");
      auth.updateUser.mockResolvedValue({ data: {}, error: null });
      auth.signOut.mockResolvedValue({ error: null });
    });

    // implements FR-4 of pre-deploy-security-hardening
    it("returns validationErrors for a missing kind of character before the session or Supabase", async () => {
      const result = await updatePasswordAction({ password: "abcdefghij1!" });

      expect(result.validationErrors?.fieldErrors.password?.[0]).toBe(FIELD_MESSAGES.passwordTooSimple);
      expect(checkRecoverySession).not.toHaveBeenCalled();
      expect(consumePasswordResetAllowance).not.toHaveBeenCalled();
      expect(auth.updateUser).not.toHaveBeenCalled();
    });

    // implements FR-5 of password-recovery
    it("returns validationErrors for a short password before the session, the allowance or Supabase", async () => {
      const result = await updatePasswordAction({ password: "abc" });

      expect(result.validationErrors?.fieldErrors.password?.[0]).toContain("12");
      expect(checkRecoverySession).not.toHaveBeenCalled();
      expect(consumePasswordResetAllowance).not.toHaveBeenCalled();
      expect(auth.updateUser).not.toHaveBeenCalled();
    });

    // implements FR-5, FR-6 of password-recovery
    it("runs recovery check, allowance, update and global sign-out in that order, then redirects", async () => {
      const order: string[] = [];
      vi.mocked(checkRecoverySession).mockImplementation(async () => {
        order.push("recovery check");
        return "recovery";
      });
      vi.mocked(consumePasswordResetAllowance).mockImplementation(async () => {
        order.push("allowance");
        return "allowed";
      });
      auth.updateUser.mockImplementation(async () => {
        order.push("updateUser");
        return { data: {}, error: null };
      });
      auth.signOut.mockImplementation(async () => {
        order.push("signOut");
        return { error: null };
      });

      await expect(updatePasswordAction({ password: NEW_PASSWORD })).rejects.toMatchObject({ digest: REDIRECT_DIGEST });

      expect(order).toEqual(["recovery check", "allowance", "updateUser", "signOut"]);
      expect(auth.updateUser).toHaveBeenCalledExactlyOnceWith({ password: NEW_PASSWORD });
      expect(auth.signOut).toHaveBeenCalledExactlyOnceWith({ scope: "global" });
      expect(redirect).toHaveBeenCalledExactlyOnceWith(UPDATED_TARGET);
    });

    // implements FR-6 of password-recovery
    it("never calls refresh", async () => {
      await expect(updatePasswordAction({ password: NEW_PASSWORD })).rejects.toMatchObject({ digest: REDIRECT_DIGEST });

      expect(refresh).not.toHaveBeenCalled();
    });

    // implements FR-6, NFR-1 of password-recovery
    it.each([
      ["an error", { error: authError("unexpected_failure", 500, NEW_PASSWORD) }],
      ["a throw", new TypeError(`fetch failed for ${NEW_PASSWORD}`)],
    ])("still redirects, to the sign-out-failed target, when the sign-out ends in %s, with one line without the password", async (_label, outcome) => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      if (outcome instanceof Error) auth.signOut.mockRejectedValue(outcome);
      else auth.signOut.mockResolvedValue(outcome);

      await expect(updatePasswordAction({ password: NEW_PASSWORD })).rejects.toMatchObject({ digest: REDIRECT_DIGEST });

      expect(redirect).toHaveBeenCalledExactlyOnceWith(SIGN_OUT_FAILED_TARGET);
      expect(warn).toHaveBeenCalledOnce();
      const logged = JSON.stringify([...warn.mock.calls, ...vi.mocked(console.error).mock.calls]);
      expect(logged).toContain("sign-out after a password change failed");
      expect(logged).not.toContain(NEW_PASSWORD);
    });

    // implements FR-4, FR-8 of password-recovery and FR-3 of pre-deploy-security-hardening
    it("returns link-expired for anything but a recent recovery session, with no allowance and no update", async () => {
      vi.mocked(checkRecoverySession).mockResolvedValue("not-recovery");

      const result = await updatePasswordAction({ password: NEW_PASSWORD });

      expect(result.data).toEqual({ status: "failed", failure: "link-expired" });
      expect(consumePasswordResetAllowance).not.toHaveBeenCalled();
      expect(auth.updateUser).not.toHaveBeenCalled();
      expect(redirect).not.toHaveBeenCalled();
    });

    // implements FR-8 of password-recovery
    it("returns unavailable when the recovery check cannot tell, with no allowance and no update", async () => {
      vi.mocked(checkRecoverySession).mockResolvedValue("unknown");

      const result = await updatePasswordAction({ password: NEW_PASSWORD });

      expect(result.data).toEqual({ status: "failed", failure: "unavailable" });
      expect(consumePasswordResetAllowance).not.toHaveBeenCalled();
      expect(auth.updateUser).not.toHaveBeenCalled();
    });

    // implements FR-9 of password-recovery
    it("returns rate-limited over the limit and does not call updateUser", async () => {
      vi.mocked(consumePasswordResetAllowance).mockResolvedValue("refused");

      const result = await updatePasswordAction({ password: NEW_PASSWORD });

      expect(result.data).toEqual({ status: "failed", failure: "rate-limited" });
      expect(auth.updateUser).not.toHaveBeenCalled();
      expect(auth.signOut).not.toHaveBeenCalled();
    });

    // implements FR-9, FR-10 of password-recovery
    it("fails closed with unknown when the allowance check fails (a restricted caller included)", async () => {
      vi.mocked(consumePasswordResetAllowance).mockResolvedValue("failed");

      const result = await updatePasswordAction({ password: NEW_PASSWORD });

      expect(result.data).toEqual({ status: "failed", failure: "unknown" });
      expect(auth.updateUser).not.toHaveBeenCalled();
      expect(JSON.stringify(result)).not.toMatch(/заблокирован|blocked|banned/i);
    });

    // implements FR-5, FR-8 of password-recovery
    it.each([
      ["same_password", 422, "same-password"],
      ["weak_password", 422, "weak-password"],
      ["over_request_rate_limit", 429, "rate-limited"],
      ["unexpected_failure", 500, "unknown"],
      // implements FR-10 of password-recovery
      ["user_banned", 403, "unknown"],
    ])("returns data.failure for the updateUser error %s", async (code, status, failure) => {
      auth.updateUser.mockResolvedValue({ data: { user: null }, error: authError(code, status) });

      const result = await updatePasswordAction({ password: NEW_PASSWORD });

      expect(result.data).toEqual({ status: "failed", failure });
      expect(auth.signOut).not.toHaveBeenCalled();
      expect(redirect).not.toHaveBeenCalled();
    });

    // implements FR-8 of password-recovery
    it("returns unavailable when the config is invalid", async () => {
      vi.mocked(createSupabaseServerClient).mockRejectedValue(new SupabaseConfigError(["NEXT_PUBLIC_SUPABASE_URL"]));

      const result = await updatePasswordAction({ password: NEW_PASSWORD });

      expect(result.data).toEqual({ status: "failed", failure: "unavailable" });
      expect(auth.updateUser).not.toHaveBeenCalled();
    });

    // implements FR-8, NFR-1 of password-recovery
    it("turns a throwing updateUser into the generic serverError without echoing or logging the password", async () => {
      auth.updateUser.mockRejectedValue(new TypeError(`fetch failed for ${NEW_PASSWORD}`));

      const result = await updatePasswordAction({ password: NEW_PASSWORD });

      expect(result.serverError).toBe(GENERIC_SERVER_ERROR);
      expect(JSON.stringify(result)).not.toContain(NEW_PASSWORD);
      expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(NEW_PASSWORD);
    });

    // implements NFR-1 of password-recovery
    it.each([
      ["a refused allowance", () => vi.mocked(consumePasswordResetAllowance).mockResolvedValue("refused")],
      [
        "an updateUser error",
        () => auth.updateUser.mockResolvedValue({ data: null, error: authError("unexpected_failure", 500, NEW_PASSWORD) }),
      ],
      ["a refused session", () => vi.mocked(checkRecoverySession).mockResolvedValue("not-recovery")],
    ])("logs nothing that holds the password after %s", async (_label, arrange) => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      arrange();

      await updatePasswordAction({ password: NEW_PASSWORD });

      const logged = JSON.stringify([...vi.mocked(console.error).mock.calls, ...warn.mock.calls]);
      expect(logged).not.toContain(NEW_PASSWORD);
    });
  });

  describe("startGoogleSignInAction", () => {
    const SITE_URL = "https://poetry.example";
    const AUTHORIZE_URL = "https://project.supabase.co/auth/v1/authorize?provider=google&code_challenge=abc";

    beforeEach(() => {
      vi.stubEnv("SITE_URL", SITE_URL);
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    // implements FR-G1 of google-sign-in
    it.each([
      ["sign-in", `${SITE_URL}/auth/callback?from=sign-in`],
      ["sign-up", `${SITE_URL}/auth/callback?from=sign-up`],
    ] as const)("starts the Google flow from %s and redirects to the authorize URL", async (from, redirectTo) => {
      auth.signInWithOAuth.mockResolvedValue({ data: { provider: "google", url: AUTHORIZE_URL }, error: null });

      await expect(startGoogleSignInAction({ from })).rejects.toMatchObject({ digest: REDIRECT_DIGEST });
      // prompt=select_account: Google shows its account chooser even when the browser is signed in to Google.
      expect(auth.signInWithOAuth).toHaveBeenCalledExactlyOnceWith({
        provider: "google",
        options: { redirectTo, queryParams: { prompt: "select_account" } },
      });
      expect(redirect).toHaveBeenCalledExactlyOnceWith(AUTHORIZE_URL);
      expect(console.error).not.toHaveBeenCalled();
    });

    // implements FR-G1 of google-sign-in
    it.each(["login", "", "https://evil.example"])("rejects from=%j before any Supabase call", async (from) => {
      const result = await startGoogleSignInAction({ from: from as "sign-in" });

      expect(result.validationErrors?.fieldErrors.from).toHaveLength(1);
      expect(result.data).toBeUndefined();
      expect(createSupabaseServerClient).not.toHaveBeenCalled();
      expect(auth.signInWithOAuth).not.toHaveBeenCalled();
    });

    // implements FR-G1, NFR-G1 of google-sign-in
    it("returns the failed result for an Auth error, logging the code and nothing personal", async () => {
      auth.signInWithOAuth.mockResolvedValue({
        data: { provider: "google", url: null },
        error: authError("validation_failed", 400, `Unsupported provider for ${EMAIL}`),
      });

      const result = await startGoogleSignInAction({ from: "sign-in" });

      expect(result.data).toEqual({ status: "failed" });
      expect(redirect).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledExactlyOnceWith("[auth] google sign-in start failed: validation_failed");
      expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(EMAIL);
    });

    // implements FR-G1, NFR-G1 of google-sign-in
    it("returns the failed result when Supabase gives no URL", async () => {
      auth.signInWithOAuth.mockResolvedValue({ data: { provider: "google", url: null }, error: null });

      const result = await startGoogleSignInAction({ from: "sign-up" });

      expect(result.data).toEqual({ status: "failed" });
      expect(redirect).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledExactlyOnceWith("[auth] google sign-in start failed");
    });

    // implements FR-G1, NFR-G1 of google-sign-in
    it("returns the failed result for a missing config, logging one line", async () => {
      vi.mocked(createSupabaseServerClient).mockRejectedValue(
        new SupabaseConfigError(["NEXT_PUBLIC_SUPABASE_URL"]),
      );

      const result = await startGoogleSignInAction({ from: "sign-in" });

      expect(result.data).toEqual({ status: "failed" });
      expect(auth.signInWithOAuth).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledExactlyOnceWith("[auth] google sign-in start failed: unavailable");
    });

    it("turns a throwing call into the generic serverError", async () => {
      auth.signInWithOAuth.mockRejectedValue(new TypeError("fetch failed"));

      const result = await startGoogleSignInAction({ from: "sign-in" });

      expect(result.serverError).toBe(GENERIC_SERVER_ERROR);
      expect(redirect).not.toHaveBeenCalled();
    });
  });

  describe("signOutAction", () => {
    // implements FR-7 of add-supabase-auth
    // implements FR-4 of remove-browser-session-read
    it("signs out this device only, refreshes the server tree, and returns ok", async () => {
      auth.signOut.mockResolvedValue({ error: null });

      const result: AuthActionResult<SignOutResult> = await signOutAction();

      expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(result.data).toEqual({ ok: true });
    });

    it("returns ok: false without refreshing when Supabase fails to sign out", async () => {
      auth.signOut.mockResolvedValue({ error: authError("unexpected_failure", 500) });

      const result = await signOutAction();

      expect(result.data).toEqual({ ok: false });
      expect(refresh).not.toHaveBeenCalled();
    });

    it("returns ok: false without refreshing when the config is invalid", async () => {
      vi.mocked(createSupabaseServerClient).mockRejectedValue(
        new SupabaseConfigError(["NEXT_PUBLIC_SUPABASE_URL"]),
      );

      const result = await signOutAction();

      expect(result.data).toEqual({ ok: false });
      expect(auth.signOut).not.toHaveBeenCalled();
      expect(refresh).not.toHaveBeenCalled();
    });
  });
});

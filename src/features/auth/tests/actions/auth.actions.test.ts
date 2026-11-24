// @vitest-environment node
import type { SupabaseClient } from "@supabase/supabase-js";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { signInAction, signOutAction, signUpAction, startGoogleSignInAction } from "../../actions/auth.actions";
import { GENERIC_SERVER_ERROR } from "../../model/auth-messages";
import type { AuthActionResult, SignInResult, SignOutResult, SignUpResult } from "../../model/auth.types";

vi.mock("@/shared/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("next/cache", () => ({ refresh: vi.fn() }));

/** Shaped like Next's real redirect error, which next-safe-action recognizes and rethrows. */
const REDIRECT_DIGEST = "NEXT_REDIRECT;replace;/;307;";

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { digest: REDIRECT_DIGEST, url });
  }),
}));

const EMAIL = "reader@example.com";
const PASSWORD = "secret-password-1";
const CREDENTIALS = { email: EMAIL, password: PASSWORD };

const auth = {
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  signInWithOAuth: vi.fn(),
};

function authError(code: string, status: number, message: string = code) {
  return { code, status, name: "AuthApiError", message };
}

describe("auth actions", () => {
  beforeEach(() => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({ auth } as unknown as SupabaseClient);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("signInAction", () => {
    // implements FR-2 of add-supabase-auth
    it("returns validationErrors for invalid input without calling Supabase", async () => {
      const result: AuthActionResult<SignInResult> = await signInAction({ email: "not-an-email", password: "" });

      expect(result.validationErrors?.fieldErrors.email).toHaveLength(1);
      expect(result.validationErrors?.fieldErrors.password).toHaveLength(1);
      expect(createSupabaseServerClient).not.toHaveBeenCalled();
      expect(auth.signInWithPassword).not.toHaveBeenCalled();
    });

    it("signs in and redirects to / on success", async () => {
      auth.signInWithPassword.mockResolvedValue({ data: {}, error: null });

      await expect(signInAction(CREDENTIALS)).rejects.toMatchObject({ digest: REDIRECT_DIGEST });
      expect(auth.signInWithPassword).toHaveBeenCalledWith(CREDENTIALS);
      expect(redirect).toHaveBeenCalledWith("/");
    });

    it.each([
      ["invalid_credentials", 400, "invalid-credentials"],
      ["email_not_confirmed", 400, "email-not-confirmed"],
      ["over_request_rate_limit", 429, "rate-limited"],
      ["unexpected_failure", 500, "unknown"],
      // implements FR-16 of admin-moderation
      ["user_banned", 400, "restricted"],
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
    it("rejects a 7-character password without calling Supabase", async () => {
      const result: AuthActionResult<SignUpResult> = await signUpAction({ email: EMAIL, password: "1234567" });

      expect(result.validationErrors?.fieldErrors.password?.[0]).toContain("8");
      expect(auth.signUp).not.toHaveBeenCalled();
    });

    it("returns check-email on success", async () => {
      auth.signUp.mockResolvedValue({ data: { user: { identities: [{ id: "1" }] } }, error: null });

      const result = await signUpAction(CREDENTIALS);

      expect(auth.signUp).toHaveBeenCalledWith(CREDENTIALS);
      expect(result.data).toEqual({ status: "check-email", email: EMAIL });
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

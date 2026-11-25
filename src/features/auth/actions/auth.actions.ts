"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";

import { RESET_PASSWORD_PATH } from "@/shared/config/account-paths";
import { SESSION_STATE } from "@/shared/config/constants";
import { getSiteUrl } from "@/shared/lib/seo";
import { SupabaseConfigError } from "@/shared/lib/supabase";
import { describeAuthError } from "@/shared/lib/supabase/claims";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { getSessionState } from "../dal/current-user";
import { consumePasswordResetAllowance } from "../dal/password-reset-allowance";
import { GOOGLE_FLOW_PARAM, RESET_STATUS, RESET_STATUS_PARAM } from "../model/auth.constants";
import type {
  AuthFailedResult,
  AuthFailure,
  SignInResult,
  SignOutResult,
  RecoveryRequestResult,
  SignUpResult,
  StartGoogleSignInResult,
  UpdatePasswordFailure,
  UpdatePasswordResult,
} from "../model/auth.types";
import { classifyAuthError, isBannedSignUpRejection } from "../model/classify-auth-error";
import { classifyRecoveryRequestError } from "../model/classify-recovery-request-error";
import { classifyUpdatePasswordError } from "../model/classify-update-password-error";
import { newPasswordSchema, recoveryRequestSchema, signInSchema, signUpSchema } from "../model/credentials.schema";
import { getGoogleLogLine } from "../model/google-log-line";
import { startGoogleSignInSchema } from "../model/google-sign-in.schema";

import { authActionClient } from "./action-client";

const HOME_PATH = "/";

const GOOGLE_PROVIDER = "google";

/** Where Supabase Auth returns a Google sign-in: the `/auth/callback` route handler (google-sign-in design D2). */
const GOOGLE_CALLBACK_PATH = "/auth/callback";

/**
 * Google always shows its account chooser, even when the browser is still signed in to Google: after "sign out"
 * the next person on a shared device must not get the last account in one press, and the visitor can pick
 * another account or cancel (google-sign-in design D1, owner 2026-11-24).
 */
const GOOGLE_QUERY_PARAMS = { prompt: "select_account" } as const;

function failed(failure: AuthFailure): AuthFailedResult {
  return { status: "failed", failure };
}

/** One log line with the reason and the error code only, never the address or the authorize URL (NFR-G1). */
function failedGoogleStart(errorCode: string | null | undefined): StartGoogleSignInResult {
  const line = getGoogleLogLine("start failed", errorCode);
  console.error(line);
  return { status: "failed" };
}

/**
 * Creates the server client, or returns the failure for a missing config. Any other error
 * propagates to the action client's `handleServerError` (design D2).
 */
async function createClientOrFailure(): Promise<
  { readonly supabase: SupabaseClient } | { readonly failure: AuthFailure }
> {
  try {
    return { supabase: await createSupabaseServerClient() };
  } catch (error) {
    if (error instanceof SupabaseConfigError) return { failure: classifyAuthError(error) };
    throw error;
  }
}

export const signInAction = authActionClient
  .inputSchema(signInSchema)
  .action(async ({ parsedInput }): Promise<SignInResult> => {
    const client = await createClientOrFailure();
    if ("failure" in client) return failed(client.failure);

    const { error } = await client.supabase.auth.signInWithPassword(parsedInput);
    if (error) return failed(classifyAuthError(error));

    // Outside every try: `redirect` throws NEXT_REDIRECT, which a catch would swallow (Gate 1 P1).
    // The server client's setAll has already written the session cookies.
    redirect(HOME_PATH);
  });

export const signUpAction = authActionClient
  .inputSchema(signUpSchema)
  .action(async ({ parsedInput }): Promise<SignUpResult> => {
    const client = await createClientOrFailure();
    if ("failure" in client) return failed(client.failure);

    const { error } = await client.supabase.auth.signUp(parsedInput);
    // A banned address gets the same answer as any other, so a ban isn't revealed (FR-17). The refusal leaves
    // one trace for the operator: the action name only, never the address.
    if (error && isBannedSignUpRejection(error)) console.warn("[auth] sign-up refused for a banned address");
    else if (error) return failed(classifyAuthError(error));

    // The same answer whatever `data.user.identities` holds, so an existing address isn't revealed.
    return { status: "check-email", email: parsedInput.email };
  });

export const signOutAction = authActionClient.action(async (): Promise<SignOutResult> => {
  const client = await createClientOrFailure();
  if ("failure" in client) return { ok: false };

  // `local` ends this device's session only; the default `global` would sign out everywhere.
  const { error } = await client.supabase.auth.signOut({ scope: "local" });
  if (error) return { ok: false };

  // Re-renders the server tree with the cleared cookies, so the header shows "Sign in" (design D4).
  refresh();
  return { ok: true };
});

const RECOVERY_SENT: RecoveryRequestResult = { status: "sent" };

/**
 * Asks Supabase to send a recovery letter (password-recovery design D3). Receives the email only and answers `sent`
 * for every outcome that depends on the address. The letter has no counter of the app's own: Supabase limits it.
 */
export const requestRecoveryAction = authActionClient
  .inputSchema(recoveryRequestSchema)
  .action(async ({ parsedInput }): Promise<RecoveryRequestResult> => {
    const client = await createClientOrFailure();
    // The only failure `createClientOrFailure` returns is a missing config.
    if ("failure" in client) return { status: "failed", failure: "unavailable" };

    const { error } = await client.supabase.auth.resetPasswordForEmail(parsedInput.email);
    if (!error) return RECOVERY_SENT;

    const answer = classifyRecoveryRequestError(error);
    if (answer !== "sent") return { status: "failed", failure: answer };

    // Answered `sent` so the answer never depends on the address; the operator still sees one line, no address.
    console.warn("[auth] recovery letter refused: email send limit");
    return RECOVERY_SENT;
  });

function updatePasswordFailed(failure: UpdatePasswordFailure): UpdatePasswordResult {
  return { status: "failed", failure };
}

/** Ends the account's sessions on every device. A throw counts as a failure: the password is already changed. */
async function endAllSessions(supabase: SupabaseClient): Promise<SignOutResult> {
  try {
    const { error } = await supabase.auth.signOut({ scope: "global" });
    if (!error) return { ok: true };

    return logSignOutFailure(error);
  } catch (error) {
    return logSignOutFailure(error);
  }
}

function logSignOutFailure(error: unknown): SignOutResult {
  console.warn(`[auth] sign-out after a password change failed: ${describeAuthError(error)}`);
  return { ok: false };
}

const RESET_UPDATED_TARGET = `${RESET_PASSWORD_PATH}?${RESET_STATUS_PARAM}=${RESET_STATUS.updated}`;
const RESET_SIGN_OUT_FAILED_TARGET = `${RESET_PASSWORD_PATH}?${RESET_STATUS_PARAM}=${RESET_STATUS.updatedSignOutFailed}`;

/**
 * Sets the recovery session's new password (password-recovery design D5): schema, session, allowance, update,
 * global sign-out, then a redirect to `/reset-password?status=…`. Success never returns; failures are values.
 * No `refresh()`: the page after the change must not need the session the sign-out just ended.
 */
export const updatePasswordAction = authActionClient
  .inputSchema(newPasswordSchema)
  .action(async ({ parsedInput }): Promise<UpdatePasswordResult> => {
    const session = await getSessionState();
    if (session.state === SESSION_STATE.signedOut) return updatePasswordFailed("link-expired");
    if (session.state === SESSION_STATE.unknown) return updatePasswordFailed("unavailable");

    const allowance = await consumePasswordResetAllowance();
    if (allowance === "refused") return updatePasswordFailed("rate-limited");
    // Fails closed: a check that could not tell never lets the update through.
    if (allowance === "failed") return updatePasswordFailed("unknown");

    const client = await createClientOrFailure();
    if ("failure" in client) return updatePasswordFailed("unavailable");

    const { error } = await client.supabase.auth.updateUser({ password: parsedInput.password });
    if (error) return updatePasswordFailed(classifyUpdatePasswordError(error));

    const signOut = await endAllSessions(client.supabase);
    const target = signOut.ok ? RESET_UPDATED_TARGET : RESET_SIGN_OUT_FAILED_TARGET;
    // Outside every try: `redirect` throws NEXT_REDIRECT, which a catch would swallow (Gate 1 P1).
    redirect(target);
  });

/**
 * Starts a Google sign-in (google-sign-in design D1): on success it redirects to Google's account chooser
 * and never returns; any failure to start returns the failed result.
 */
export const startGoogleSignInAction = authActionClient
  .inputSchema(startGoogleSignInSchema)
  .action(async ({ parsedInput }): Promise<StartGoogleSignInResult> => {
    const client = await createClientOrFailure();
    if ("failure" in client) return failedGoogleStart(client.failure);

    const siteUrl = getSiteUrl();
    const redirectTo = `${siteUrl}${GOOGLE_CALLBACK_PATH}?${GOOGLE_FLOW_PARAM}=${parsedInput.from}`;
    // The server client's setAll writes the PKCE code-verifier cookie, so the redirect below carries it.
    const { data, error } = await client.supabase.auth.signInWithOAuth({
      provider: GOOGLE_PROVIDER,
      options: { redirectTo, queryParams: GOOGLE_QUERY_PARAMS },
    });
    if (error) return failedGoogleStart(error.code);
    if (!data.url) return failedGoogleStart(null);

    // Outside every try: `redirect` throws NEXT_REDIRECT, which a catch would swallow (Gate 1 P1).
    redirect(data.url);
  });

import type { GOOGLE_FLOW, RESET_STATUS, SIGN_OUT_STATUS } from "./auth.constants";

/** Why an auth call failed, in the terms the forms show (design D7). */
export type AuthFailure =
  | "invalid-credentials"
  | "email-not-confirmed"
  | "rate-limited"
  | "restricted"
  | "weak-password"
  | "same-password"
  | "unavailable"
  | "unknown";

/** The forms and actions that own their own failure texts; a flow never borrows another's wording (design D7). */
export type AuthFlow = "sign-in" | "sign-up" | "recovery-request" | "update-password";

type CredentialField = "email" | "password";

export interface AuthFailedResult {
  readonly status: "failed";
  readonly failure: AuthFailure;
}

/** Sign-in success never returns a value: the action redirects to `/`. */
export type SignInResult = AuthFailedResult;

/** `check-email` is returned whether or not the address was already registered. */
export type SignUpResult = { readonly status: "check-email"; readonly email: string } | AuthFailedResult;

export type SignOutResult = { readonly ok: true } | { readonly ok: false };

/** `signOutWithConfirmation`'s outcome: one of `SIGN_OUT_STATUS` (edit-poem design D10). */
export interface SignOutWithConfirmationResult {
  readonly status: (typeof SIGN_OUT_STATUS)[keyof typeof SIGN_OUT_STATUS];
}

/**
 * The part of a next-safe-action result the forms read, with the client's `"flattened"`
 * validation-error shape. Declared here so `model/` stays free of the library.
 */
export interface AuthActionResult<Data> {
  readonly data?: Data;
  readonly serverError?: string;
  readonly validationErrors?: {
    readonly formErrors: readonly string[];
    readonly fieldErrors: Readonly<Partial<Record<CredentialField, readonly string[]>>>;
  };
}

/** One message per field; never holds the password itself. */
export type FieldErrors = Readonly<Partial<Record<CredentialField, string>>>;

interface IdleFormState {
  readonly status: "idle";
  readonly email: string;
}

interface InvalidFormState {
  readonly status: "invalid";
  readonly email: string;
  readonly fieldErrors: FieldErrors;
}

interface FailedFormState {
  readonly status: "failed";
  readonly email: string;
  readonly failure: AuthFailure;
}

export type SignInFormState = IdleFormState | InvalidFormState | FailedFormState;

export type SignUpFormState =
  | SignInFormState
  | { readonly status: "check-email"; readonly email: string };

/** The page a Google sign-in started on: one of `GOOGLE_FLOW` (google-sign-in design D2). */
export type GoogleFlow = (typeof GOOGLE_FLOW)[keyof typeof GOOGLE_FLOW];

/** Why a Google sign-in ended without a session (google-sign-in design D3). */
export type GoogleFailureReason = "cancelled" | "blocked" | "failed";

/** How `/auth/callback` finished: success is explicit, never "no error" (design D3). */
export type GoogleSignInResult =
  | { readonly ok: true; readonly accountExisted: boolean }
  | { readonly ok: false; readonly reason: GoogleFailureReason };

/** The search parameters Supabase Auth sends to `/auth/callback`; any of them may be missing. */
export interface GoogleCallbackParams {
  readonly code: string | null;
  readonly error: string | null;
  readonly errorCode: string | null;
  readonly errorDescription: string | null;
}

/** The two timestamps of the signed-in user that tell a new account from an existing one (design D4). */
export interface GoogleCallbackUser {
  readonly created_at: string;
  readonly last_sign_in_at?: string;
}

/** Starting a Google sign-in never returns on success: the action redirects to Google (design D1). */
export interface StartGoogleSignInResult {
  readonly status: "failed";
}

/** `GoogleSignInButton`'s action state: nothing pressed yet, or a failed start (design D6, D7). */
export type GoogleSignInButtonState = { readonly status: "idle" } | StartGoogleSignInResult;

/** Why a letter request failed: the only failures the request flow can produce (password-recovery design D3). */
export type RecoveryRequestFailure = "rate-limited" | "unavailable" | "unknown";

/** Why a password change failed: the request failures plus the ones only the update flow has (design D5). */
export type UpdatePasswordFailure = RecoveryRequestFailure | "link-expired" | "same-password" | "weak-password";

/** `requestRecoveryAction`'s answer: `sent` whatever the address holds, never a hint about it (design D3). */
export type RecoveryRequestResult =
  | { readonly status: "sent" }
  | { readonly status: "invalid" }
  | { readonly status: "failed"; readonly failure: RecoveryRequestFailure };

/** Changing the password never returns on success: the action redirects to `/reset-password?status=…` (design D5). */
export interface UpdatePasswordResult {
  readonly status: "failed";
  readonly failure: UpdatePasswordFailure;
}

/** How a link's `verifyOtp` ended; `/auth/confirm` turns it into a redirect target (design D1). */
export type ConfirmOutcome = "verified" | "failed";

/** A `RESET_STATUS` value: what `/reset-password` shows after a successful change (design D4, D5). */
export type ResetStatus = (typeof RESET_STATUS)[keyof typeof RESET_STATUS];

/** `consume_write_allowance("password_reset")`'s answer; a refusal is a value, a failed check never allows (design D5). */
export type PasswordResetAllowance = "allowed" | "refused" | "failed";

/**
 * The caller's own `is_restricted()` answer for `/reset-password` (design D4, D8). `unauthenticated` is a token that
 * expired since the session read; `unknown` is any other failure and fails closed.
 */
export type RestrictionCheck = "restricted" | "allowed" | "unauthenticated" | "unknown";

// implements FR-2 of add-supabase-auth
// implements FR-4 of add-supabase-auth
/** Why an auth call failed, in the terms the forms show (design D7). */
export type AuthFailure =
  | "invalid-credentials"
  | "email-not-confirmed"
  | "rate-limited"
  | "weak-password"
  | "unavailable"
  | "unknown";

export type AuthFlow = "sign-in" | "sign-up";

type CredentialField = "email" | "password";

export interface AuthFailedResult {
  readonly status: "failed";
  readonly failure: AuthFailure;
}

/** Sign-in success never returns a value: the action redirects to `/`. */
export type SignInResult = AuthFailedResult;

/** `check-email` is returned whether or not the address was already registered (FR-4). */
export type SignUpResult = { readonly status: "check-email"; readonly email: string } | AuthFailedResult;

export type SignOutResult = { readonly ok: true } | { readonly ok: false };

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

/** One message per field; never holds the password itself (NFR-1). */
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

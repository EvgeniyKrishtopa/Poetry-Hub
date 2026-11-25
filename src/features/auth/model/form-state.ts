import { getFailureMessage } from "./auth-messages";
import type {
  AuthActionResult,
  FieldErrors,
  RecoveryRequestResult,
  ResetPasswordFormState,
  SignInFormState,
  SignInResult,
  SignUpFormState,
  SignUpResult,
  UpdatePasswordResult,
} from "./auth.types";

type SharedFormState = Exclude<SignInFormState, { status: "idle" }>;

function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/** The submitted credentials, read only to pass straight to the action (never stored). */
export function readCredentials(formData: FormData): { readonly email: string; readonly password: string } {
  return { email: readField(formData, "email"), password: readField(formData, "password") };
}

/** The submitted new password, read only to pass straight to the action (never stored). */
export function readNewPassword(formData: FormData): { readonly password: string } {
  return { password: readField(formData, "password") };
}

function firstFieldErrors(
  fieldErrors: NonNullable<AuthActionResult<unknown>["validationErrors"]>["fieldErrors"],
): FieldErrors {
  return { email: fieldErrors.email?.[0], password: fieldErrors.password?.[0] };
}

/** The branches both forms share; `fromData` handles the action's own result (design D7). */
function toFormState<Data, State>(
  result: AuthActionResult<Data>,
  email: string,
  fromData: (data: Data) => State,
): SharedFormState | State {
  if (result.validationErrors) {
    return { status: "invalid", email, fieldErrors: firstFieldErrors(result.validationErrors.fieldErrors) };
  }
  if (result.serverError !== undefined || result.data === undefined) {
    return { status: "failed", email, failure: "unknown" };
  }
  return fromData(result.data);
}

export function toSignInFormState(result: AuthActionResult<SignInResult>, email: string): SignInFormState {
  return toFormState(result, email, (data) => ({ status: "failed", email, failure: data.failure }));
}

/** The recovery action's answer; an unreadable result is the generic failure, never `sent` (design D3). */
export function toRecoveryRequestResult(result: AuthActionResult<RecoveryRequestResult>): RecoveryRequestResult {
  if (result.validationErrors) return { status: "invalid" };
  if (result.serverError !== undefined || result.data === undefined) return { status: "failed", failure: "unknown" };
  return result.data;
}

/** The new-password action's failure as the form shows it; success redirects, so it never arrives here (design D5). */
export function toResetPasswordFormState(result: AuthActionResult<UpdatePasswordResult>): ResetPasswordFormState {
  const schemaMessage = result.validationErrors?.fieldErrors.password?.[0];
  if (schemaMessage !== undefined) return { status: "invalid", fieldError: schemaMessage };
  if (result.validationErrors || result.serverError !== undefined || result.data === undefined) {
    return { status: "failed", failure: "unknown" };
  }

  const { failure } = result.data;
  if (failure === "weak-password" || failure === "same-password") {
    return { status: "invalid", fieldError: getFailureMessage("update-password", failure) };
  }
  return { status: "failed", failure };
}

export function toSignUpFormState(result: AuthActionResult<SignUpResult>, email: string): SignUpFormState {
  return toFormState(result, email, (data): SignUpFormState => {
    if (data.status === "check-email") return { status: "check-email", email: data.email };
    if (data.failure === "weak-password") {
      return {
        status: "invalid",
        email,
        fieldErrors: { password: getFailureMessage("sign-up", "weak-password") },
      };
    }
    return { status: "failed", email, failure: data.failure };
  });
}

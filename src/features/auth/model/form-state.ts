import { getFailureMessage } from "./auth-messages";
import type {
  AuthActionResult,
  FieldErrors,
  SignInFormState,
  SignInResult,
  SignUpFormState,
  SignUpResult,
} from "./auth.types";

type SharedFormState = Exclude<SignInFormState, { status: "idle" }>;

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

// implements FR-2 of add-supabase-auth
export function toSignInFormState(result: AuthActionResult<SignInResult>, email: string): SignInFormState {
  return toFormState(result, email, (data) => ({ status: "failed", email, failure: data.failure }));
}

// implements FR-4 of add-supabase-auth
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

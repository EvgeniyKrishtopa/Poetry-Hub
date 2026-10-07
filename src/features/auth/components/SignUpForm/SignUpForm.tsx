"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Alert, Button } from "@/shared/ui";

import { signUpAction } from "../../actions/auth.actions";
import { CHECK_EMAIL_TITLE, getFailureMessage } from "../../model/auth-messages";
import type { SignUpFormState } from "../../model/auth.types";
import { readCredentials, toSignUpFormState } from "../../model/form-state";
import { AuthField } from "../AuthField/AuthField";

const INITIAL_STATE: SignUpFormState = { status: "idle", email: "" };

/** The password is passed on to the action, never kept in state. */
async function submitSignUp(_previous: SignUpFormState, formData: FormData): Promise<SignUpFormState> {
  const credentials = readCredentials(formData);
  return toSignUpFormState(await signUpAction(credentials), credentials.email);
}

// implements FR-3 of add-supabase-auth
// implements FR-4 of add-supabase-auth
// implements NFR-3 of add-supabase-auth
// implements NFR-4 of add-supabase-auth: token utilities only, no color literals
export function SignUpForm() {
  const [state, formAction, pending] = useActionState(submitSignUp, INITIAL_STATE);

  if (state.status === "check-email") {
    // The same message whether or not the address was already registered (FR-4).
    return (
      // implements FR-6 of add-feedback-color-tokens: foreground body (muted on surface fails AA)
      <Alert tone="success" className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{CHECK_EMAIL_TITLE}</h2>
        <p className="font-normal">
          We sent a confirmation link to <strong>{state.email}</strong>. Open it to finish creating your
          account.
        </p>
      </Alert>
    );
  }

  const fieldErrors = state.status === "invalid" ? state.fieldErrors : {};
  const formError = state.status === "failed" ? getFailureMessage("sign-up", state.failure) : undefined;

  return (
    // noValidate: the server-side schema is the only validation, so its errors are what the reader sees.
    <form action={formAction} noValidate className="flex w-full flex-col gap-4">
      {formError && (
        // implements FR-4 of add-feedback-color-tokens
        <Alert tone="danger">{formError}</Alert>
      )}
      <AuthField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={state.email}
        error={fieldErrors.email}
      />
      <AuthField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        error={fieldErrors.password}
      />
      <Button type="submit" disabled={pending}>
        Create account
      </Button>
      <p className="text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-accent underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}

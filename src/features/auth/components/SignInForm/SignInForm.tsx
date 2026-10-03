"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/shared/ui";

import { signInAction } from "../../actions/auth.actions";
import { getFailureMessage } from "../../model/auth-messages";
import type { SignInFormState } from "../../model/auth.types";
import { readCredentials, toSignInFormState } from "../../model/form-state";
import { AuthField } from "../AuthField/AuthField";

const INITIAL_STATE: SignInFormState = { status: "idle", email: "" };

/** Success never returns: the action redirects to `/`. The password is passed on, never kept. */
async function submitSignIn(_previous: SignInFormState, formData: FormData): Promise<SignInFormState> {
  const credentials = readCredentials(formData);
  return toSignInFormState(await signInAction(credentials), credentials.email);
}

interface SignInFormProps {
  /** A form-level message shown until the first submission, e.g. FR-5's confirm-failed text. */
  readonly initialError?: string;
}

// implements FR-1 of add-supabase-auth
// implements FR-2 of add-supabase-auth
// implements NFR-3 of add-supabase-auth
export function SignInForm({ initialError }: SignInFormProps) {
  const [state, formAction, pending] = useActionState(submitSignIn, INITIAL_STATE);

  const fieldErrors = state.status === "invalid" ? state.fieldErrors : {};
  const formError =
    state.status === "failed"
      ? getFailureMessage("sign-in", state.failure)
      : state.status === "idle"
        ? initialError
        : undefined;

  return (
    // noValidate: the server-side schema is the only validation, so its errors are what the reader sees.
    <form action={formAction} noValidate className="flex w-full flex-col gap-4">
      {formError && (
        <p role="alert" className="rounded-md bg-surface px-3 py-2 text-sm font-medium">
          {formError}
        </p>
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
        autoComplete="current-password"
        error={fieldErrors.password}
      />
      <Button type="submit" disabled={pending}>
        Sign in
      </Button>
      <p className="text-sm text-muted">
        New here?{" "}
        <Link href="/signup" className="text-accent underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

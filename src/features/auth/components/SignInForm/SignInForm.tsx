"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Alert, Button, TextField } from "@/shared/ui";

import type { SignInFormState } from "../../model/auth.types";

import { getFormError } from "./get-form-error";
import type { SignInFormProps } from "./SignInForm.types";
import { submitSignIn } from "./submit-sign-in";

const INITIAL_STATE: SignInFormState = { status: "idle", email: "" };

// implements NFR-4 of add-supabase-auth: token utilities only, no color literals
export function SignInForm({ initialError }: SignInFormProps) {
  const [state, formAction, pending] = useActionState(submitSignIn, INITIAL_STATE);

  const fieldErrors = state.status === "invalid" ? state.fieldErrors : {};
  const formError = getFormError(state, initialError);

  return (
    // noValidate: the server-side schema is the only validation, so its errors are what the reader sees.
    <form action={formAction} noValidate className="flex w-full flex-col gap-4">
      {formError && <Alert tone="danger">{formError}</Alert>}
      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={state.email}
        error={fieldErrors.email}
      />
      <TextField
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

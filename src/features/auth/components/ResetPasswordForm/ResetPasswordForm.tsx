"use client";

import { useActionState } from "react";

import { SIGN_IN_PATH } from "@/shared/config/account-paths";
import { useConnection } from "@/shared/lib/network/use-connection";
import { Alert, Button, ButtonLink, ConnectionNotice, TextField } from "@/shared/ui";

import {
  BACK_TO_SIGN_IN_LABEL,
  getFailureMessage,
  NEW_PASSWORD_LABEL,
  NEW_PASSWORD_SUBMIT_LABEL,
} from "../../model/auth-messages";
import type { ResetPasswordFormState } from "../../model/auth.types";

import { submitNewPassword } from "./submit-new-password";

const INITIAL_STATE: ResetPasswordFormState = { status: "idle" };

/**
 * The new-password form: one field, a submit button, field and form errors, and the connection guard. When the
 * session ended there is nothing left to save, so the form gives way to the alert and the link to `/login`
 * (password-recovery design D5, D7).
 */
// implements NFR-3 of password-recovery: token utilities only, no color literals
export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(submitNewPassword, INITIAL_STATE);
  const { status, isOnline } = useConnection();

  if (state.status === "failed" && state.failure === "link-expired") {
    return (
      <div className="flex flex-col items-start gap-4">
        <Alert tone="danger" className="self-stretch">
          {getFailureMessage("update-password", state.failure)}
        </Alert>
        <ButtonLink href={SIGN_IN_PATH}>{BACK_TO_SIGN_IN_LABEL}</ButtonLink>
      </div>
    );
  }

  const fieldError = state.status === "invalid" ? state.fieldError : undefined;
  const formError = state.status === "failed" ? getFailureMessage("update-password", state.failure) : undefined;
  const disabled = pending || !isOnline;

  return (
    // noValidate: the server-side schema is the only validation, so its errors are what the reader sees.
    <form action={formAction} noValidate aria-busy={pending} className="flex w-full flex-col gap-4">
      {formError && <Alert tone="danger">{formError}</Alert>}
      <ConnectionNotice status={status} />
      <TextField
        label={NEW_PASSWORD_LABEL}
        name="password"
        type="password"
        autoComplete="new-password"
        disabled={disabled}
        error={fieldError}
      />
      <Button type="submit" disabled={disabled}>
        {NEW_PASSWORD_SUBMIT_LABEL}
      </Button>
    </form>
  );
}

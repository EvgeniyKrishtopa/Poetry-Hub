"use client";

import Link from "next/link";
import { startTransition, useActionState, useRef, useState } from "react";

import { SIGN_UP_PATH } from "@/shared/config/account-paths";
import { Alert, Button, TextField } from "@/shared/ui";

import { RECOVERY_SENT_MESSAGE } from "../../model/auth-messages";
import type { RecoveryOfferResult, RecoveryOfferState, SignInFormState } from "../../model/auth.types";
import { focusFormField } from "../focus-form-field";
import { RecoveryOffer } from "../RecoveryOffer/RecoveryOffer";

import { getRecoveryView } from "./get-recovery-view";
import type { SignInFormProps } from "./SignInForm.types";
import { submitRecoveryRequest } from "./submit-recovery-request";
import { submitSignIn } from "./submit-sign-in";

const INITIAL_STATE: SignInFormState = { status: "idle", email: "" };
/** The email input's name; the field below and the focus after an invalid address use the same one. */
const EMAIL_FIELD_NAME = "email";
const IDLE_RECOVERY: RecoveryOfferResult = { status: "idle" };
const INITIAL_RECOVERY: RecoveryOfferState = { attempt: 0, result: IDLE_RECOVERY };

/**
 * The sign-in form and, after wrong credentials or a dead recovery link, the offer to send a recovery letter. The
 * form holds both actions' results: the email field belongs to it, and an invalid address answers under that field
 * (password-recovery design D2).
 */
// implements NFR-4 of add-supabase-auth: token utilities only, no color literals
export function SignInForm({ initialError, offerOnLoad = false }: SignInFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [email, setEmail] = useState("");
  const [attempt, setAttempt] = useState(0);

  // Counted at the start of every sign-in submit, so a recovery result of an earlier attempt is dropped at once.
  async function signIn(previous: SignInFormState, formData: FormData): Promise<SignInFormState> {
    setAttempt((current) => current + 1);
    return submitSignIn(previous, formData);
  }
  const [state, formAction, pending] = useActionState(signIn, INITIAL_STATE);

  async function requestRecovery(): Promise<RecoveryOfferState> {
    const result = await submitRecoveryRequest(email);
    if (result.status === "invalid") focusFormField(formRef.current, EMAIL_FIELD_NAME);
    return { attempt, result };
  }
  const [recoveryState, recoveryAction, recoveryPending] = useActionState(requestRecovery, INITIAL_RECOVERY);

  const recovery = recoveryState.attempt === attempt ? recoveryState.result : IDLE_RECOVERY;
  const view = getRecoveryView({ signIn: state, initialError, offerOnLoad, recovery });
  const fieldErrors = state.status === "invalid" ? state.fieldErrors : {};
  const busy = pending || recoveryPending;

  function requestLetter(): void {
    startTransition(recoveryAction);
  }

  return (
    // noValidate: the server-side schema is the only validation, so its errors are what the reader sees.
    <form
      ref={formRef}
      action={formAction}
      noValidate
      aria-busy={busy}
      className="flex w-full flex-col gap-4"
    >
      {view.alert && <Alert tone="danger">{view.alert}</Alert>}
      {view.sentNotice && <Alert tone="neutral">{RECOVERY_SENT_MESSAGE}</Alert>}
      {view.offerVisible && <RecoveryOffer showText={!view.sentNotice} busy={busy} onRequest={requestLetter} />}
      <TextField
        label="Электронная почта"
        name={EMAIL_FIELD_NAME}
        type="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={view.emailError ?? fieldErrors.email}
      />
      <TextField
        label="Пароль"
        name="password"
        type="password"
        autoComplete="current-password"
        error={fieldErrors.password}
      />
      <Button type="submit" disabled={busy}>
        Войти
      </Button>
      <p className="text-sm text-muted">
        Впервые здесь?{" "}
        <Link href={SIGN_UP_PATH} className="text-accent underline">
          Создать аккаунт
        </Link>
      </p>
    </form>
  );
}

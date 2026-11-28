"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";

import { SIGN_IN_PATH } from "@/shared/config/account-paths";
import { Alert, Button, TextField, TurnstileField, type TurnstileFieldHandle } from "@/shared/ui";

import { CHECK_EMAIL_TITLE, getFailureMessage } from "../../model/auth-messages";
import type { SignUpFormState } from "../../model/auth.types";

import { submitSignUp } from "./submit-sign-up";

const INITIAL_STATE: SignUpFormState = { status: "idle", email: "" };

// implements NFR-4 of add-supabase-auth: token utilities only, no color literals
export function SignUpForm() {
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<TurnstileFieldHandle>(null);

  async function signUp(previous: SignUpFormState, formData: FormData): Promise<SignUpFormState> {
    const result = await submitSignUp(previous, formData, captchaToken ?? "");
    // A token is used once, whatever the answer was.
    captchaRef.current?.reset();
    return result;
  }
  const [state, formAction, pending] = useActionState(signUp, INITIAL_STATE);

  if (state.status === "check-email") {
    // The same message whether or not the address was already registered.
    return (
      // Foreground body text: muted on surface fails AA.
      <Alert tone="success" className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">{CHECK_EMAIL_TITLE}</h2>
        <p className="font-normal">
          Мы отправили ссылку для подтверждения на <strong>{state.email}</strong>. Откройте её, чтобы
          завершить регистрацию.
        </p>
      </Alert>
    );
  }

  const fieldErrors = state.status === "invalid" ? state.fieldErrors : {};
  const failureMessage = state.status === "failed" ? getFailureMessage("sign-up", state.failure) : undefined;
  // A rejected captcha is said next to the check block; every other failure at the top of the form.
  const captchaRejected = state.status === "failed" && state.failure === "captcha";
  const formError = captchaRejected ? undefined : failureMessage;
  const captchaError = captchaRejected ? failureMessage : undefined;

  return (
    // noValidate: the server-side schema is the only validation, so its errors are what the reader sees.
    <form action={formAction} noValidate className="flex w-full flex-col gap-4">
      {formError && <Alert tone="danger">{formError}</Alert>}
      <TextField
        label="Электронная почта"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={state.email}
        error={fieldErrors.email}
      />
      <TextField
        label="Пароль"
        name="password"
        type="password"
        autoComplete="new-password"
        error={fieldErrors.password}
      />
      {captchaError && <Alert tone="danger">{captchaError}</Alert>}
      <TurnstileField ref={captchaRef} onTokenChange={setCaptchaToken} />
      <Button type="submit" disabled={pending || captchaToken === null}>
        Зарегистрироваться
      </Button>
      <p className="text-sm text-muted">
        Уже есть аккаунт?{" "}
        <Link href={SIGN_IN_PATH} className="text-accent underline">
          Войти
        </Link>
      </p>
    </form>
  );
}

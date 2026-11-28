"use client";

import { useActionState, useEffect, useRef, useState, startTransition } from "react";

import { Alert, Button, SessionUnavailableAlert, TextField } from "@/shared/ui";

import { TOTP_CODE_LENGTH } from "../../model/admin.constants";
import { ADMIN_VERIFY_COPY } from "../../model/admin-messages";

import { submitTotpCode } from "./submit-totp-code";
import styles from "./TotpCodeForm.module.css";
import type { TotpCodeFormProps, TotpCodeFormState } from "./TotpCodeForm.types";

const IDLE: TotpCodeFormState = { status: "idle" };

/** The code field and its submit, used by code entry and by enrolment. */
export function TotpCodeForm({ factorId, children }: TotpCodeFormProps) {
  const [code, setCode] = useState("");
  const [state, send, pending] = useActionState(
    async (_previous: TotpCodeFormState, input: string | null): Promise<TotpCodeFormState> => {
      // `null` is the retry button: back to an empty-handed form.
      if (input === null || factorId === null) return IDLE;
      return submitTotpCode({ factorId, code: input });
    },
    IDLE,
  );
  const formRef = useRef<HTMLFormElement>(null);

  // The field is disabled while the code is checked, which drops its focus; it goes back after a failed send.
  useEffect(() => {
    if (state.status === "failed") formRef.current?.querySelector("input")?.focus();
  }, [state]);

  const failure = state.status === "failed" ? state.failure : undefined;
  if (failure === "unavailable") {
    return <SessionUnavailableAlert onRetry={() => startTransition(() => send(null))} />;
  }

  const disabled = pending || factorId === null;

  return (
    <>
      {children}
      <form
        ref={formRef}
        action={() => send(code)}
        noValidate
        aria-busy={pending}
        className="flex w-full flex-col items-start gap-4"
      >
        {failure === "limited" && (
          <Alert tone="danger" className="self-stretch">
            {ADMIN_VERIFY_COPY.limited}
          </Alert>
        )}
        <div className={`${styles.code} self-stretch`}>
          <TextField
            label={ADMIN_VERIFY_COPY.codeLabel}
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={TOTP_CODE_LENGTH}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            disabled={disabled}
            error={failure === "wrong-code" ? ADMIN_VERIFY_COPY.wrongCode : undefined}
          />
        </div>
        <Button type="submit" disabled={disabled} aria-busy={pending}>
          {ADMIN_VERIFY_COPY.submitButton}
        </Button>
      </form>
    </>
  );
}

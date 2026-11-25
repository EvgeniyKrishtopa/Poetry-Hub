"use client";

import { SIGN_IN_PATH } from "@/shared/config/account-paths";
import { Alert, ButtonLink } from "@/shared/ui";

import { BACK_TO_SIGN_IN_LABEL, PASSWORD_RESET_DONE_MESSAGES } from "../../model/auth-messages";
import { RESET_STATUS } from "../../model/auth.constants";

import type { PasswordResetDoneProps } from "./PasswordResetDone.types";

/** Focus on mount: the notice is the main content of a freshly loaded page, where a live region may announce nothing. */
function focusNotice(notice: HTMLDivElement | null): void {
  notice?.focus();
}

/**
 * The notice after a password change, with the link to `/login`; one notice for the two status values, taking
 * focus on first render (password-recovery design D4, D5).
 */
// implements NFR-3 of password-recovery: token utilities only, no color literals
export function PasswordResetDone({ status }: PasswordResetDoneProps) {
  const tone = status === RESET_STATUS.updated ? "success" : "neutral";

  return (
    <div className="flex flex-col items-start gap-4">
      <div
        ref={focusNotice}
        tabIndex={-1}
        className="self-stretch rounded-md focus:outline-2 focus:outline-offset-2 focus:outline-accent"
      >
        <Alert tone={tone}>{PASSWORD_RESET_DONE_MESSAGES[status]}</Alert>
      </div>
      <ButtonLink href={SIGN_IN_PATH}>{BACK_TO_SIGN_IN_LABEL}</ButtonLink>
    </div>
  );
}

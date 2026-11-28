"use client";

import { useEffect, useRef } from "react";

import { useConnection } from "@/shared/lib/network/use-connection";
import { Button, ConnectionNotice } from "@/shared/ui";

import { RECOVERY_OFFER_BUTTON_LABEL, RECOVERY_OFFER_TEXT } from "../../model/auth-messages";

import type { RecoveryOfferProps } from "./RecoveryOffer.types";

/**
 * The offer to send a recovery letter, drawn inside the sign-in `<form>`: its text, its own connection notice and
 * the button. The button is `type="button"`: it sits before «Войти» in the page order, and a submit button there
 * would take Enter's implicit submit from the sign-in (password-recovery design D2, D7).
 */
// implements NFR-3 of password-recovery: token utilities only, no color literals
export function RecoveryOffer({ showText, busy, captchaReady, onRequest }: RecoveryOfferProps) {
  const { status, isOnline } = useConnection();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const requestedRef = useRef(false);
  const disabled = busy || !isOnline || !captchaReady;

  // A browser drops the focus of a button that is disabled while its request is pending; take it back once the button
  // is enabled again (after the next captcha token), unless it moved on purpose (the email field after an invalid
  // address).
  useEffect(() => {
    if (disabled || !requestedRef.current) return;
    requestedRef.current = false;
    if (document.activeElement === document.body) buttonRef.current?.focus();
  }, [disabled]);

  function requestLetter(): void {
    requestedRef.current = true;
    onRequest();
  }

  return (
    <div className="flex flex-col items-start gap-3 self-stretch">
      {showText && <p className="text-sm text-muted">{RECOVERY_OFFER_TEXT}</p>}
      <ConnectionNotice status={status} />
      <Button ref={buttonRef} type="button" variant="ghost" disabled={disabled} onClick={requestLetter}>
        {RECOVERY_OFFER_BUTTON_LABEL}
      </Button>
    </div>
  );
}

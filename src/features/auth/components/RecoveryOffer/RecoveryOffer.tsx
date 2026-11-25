"use client";

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
export function RecoveryOffer({ showText, busy, onRequest }: RecoveryOfferProps) {
  const { status, isOnline } = useConnection();

  return (
    <div className="flex flex-col items-start gap-3 self-stretch">
      {showText && <p className="text-sm text-muted">{RECOVERY_OFFER_TEXT}</p>}
      <ConnectionNotice status={status} />
      <Button type="button" variant="ghost" disabled={busy || !isOnline} onClick={onRequest}>
        {RECOVERY_OFFER_BUTTON_LABEL}
      </Button>
    </div>
  );
}

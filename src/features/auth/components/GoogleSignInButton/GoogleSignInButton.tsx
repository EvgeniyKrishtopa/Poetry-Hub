"use client";

import Image from "next/image";
import { useActionState } from "react";

import { useConnection } from "@/shared/lib/network/use-connection";
import { Alert, Button, ConnectionNotice } from "@/shared/ui";

import { GOOGLE_BUTTON_LABEL, GOOGLE_CONNECTION_MESSAGES } from "../../model/auth-messages";
import type { GoogleSignInButtonState } from "../../model/auth.types";

import { getGoogleAlert } from "./get-google-alert";
import type { GoogleSignInButtonProps } from "./GoogleSignInButton.types";
import { submitGoogleSignIn } from "./submit-google-sign-in";

const INITIAL_STATE: GoogleSignInButtonState = { status: "idle" };

/** Google's own four-colour mark, a static file so its brand colours stay out of the token-only code. */
const GOOGLE_MARK_SRC = "/google-g.svg";
const GOOGLE_MARK_SIZE_PX = 18;

/**
 * The Google widget under the password form: one alert slot, the connection notice and the button,
 * disabled offline, on a slow connection and while pending (google-sign-in design D6, D7).
 */
// implements NFR-4 of add-supabase-auth: token utilities only, no color literals
export function GoogleSignInButton({ from, initialError }: GoogleSignInButtonProps) {
  const [state, formAction, pending] = useActionState(() => submitGoogleSignIn(from), INITIAL_STATE);
  const { status, isOnline } = useConnection();

  const alert = getGoogleAlert(state, pending, initialError);

  return (
    <form action={formAction} className="flex w-full flex-col gap-4">
      {alert && <Alert tone="danger">{alert}</Alert>}
      <ConnectionNotice status={status} messages={GOOGLE_CONNECTION_MESSAGES} />
      <Button type="submit" variant="ghost" className="w-full" disabled={pending || !isOnline} aria-busy={pending}>
        {/* Decorative: the label already names Google. A local SVG needs no optimisation. */}
        <Image src={GOOGLE_MARK_SRC} alt="" width={GOOGLE_MARK_SIZE_PX} height={GOOGLE_MARK_SIZE_PX} unoptimized />
        {GOOGLE_BUTTON_LABEL[from]}
      </Button>
    </form>
  );
}

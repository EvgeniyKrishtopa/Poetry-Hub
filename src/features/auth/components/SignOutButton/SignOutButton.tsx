"use client";

import { useRef, useState, useTransition } from "react";

import { Button } from "@/shared/ui";

import { signOutAction } from "../../actions/auth.actions";
import { SIGN_OUT_FAILED_MESSAGE } from "../../model/auth-messages";
import { SIGN_OUT_STATUS } from "../../model/auth.constants";
import { signOutWithConfirmation } from "./sign-out-with-confirmation";

/**
 * The header's "Sign out". On success the action refreshes the server tree, which re-renders
 * the header as "Sign in"; this component only keeps the failure state (design D2). A page with
 * unsaved edits is asked first (edit-poem design D10).
 */
// implements NFR-4 of add-supabase-auth: token utilities only, no color literals
export function SignOutButton() {
  const [signingOut, startSignOut] = useTransition();
  const [signOutFailed, setSignOutFailed] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Disabled only while the request is sending, never while the page's question is open.
  function send() {
    setSignOutFailed(false);
    startSignOut(async () => {
      let ok = false;
      try {
        ok = (await signOutAction()).data?.ok === true;
      } catch {
        // A failed call means the cookies may still exist: stay signed in and say so.
      }
      if (!ok) setSignOutFailed(true);
    });
  }

  async function signOut() {
    const outcome = await signOutWithConfirmation(send);
    // The author chose to stay: focus back here by hand, the dialog's own restore isn't reliable everywhere.
    if (outcome.status === SIGN_OUT_STATUS.stayed) buttonRef.current?.focus();
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      {signOutFailed && (
        // Inline text: a boxed Alert would break the header row.
        <p role="alert" className="font-medium text-danger">
          {SIGN_OUT_FAILED_MESSAGE}
        </p>
      )}
      <Button ref={buttonRef} variant="ghost" onClick={signOut} disabled={signingOut}>
        Выйти
      </Button>
    </div>
  );
}

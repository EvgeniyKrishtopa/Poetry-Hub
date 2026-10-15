"use client";

import { useState, useTransition } from "react";

import { Button } from "@/shared/ui";

import { signOutAction } from "../../actions/auth.actions";
import { SIGN_OUT_FAILED_MESSAGE } from "../../model/auth-messages";

/**
 * The header's "Sign out". On success the action refreshes the server tree, which re-renders
 * the header as "Sign in"; this component only keeps the failure state (design D2).
 */
// implements NFR-4 of add-supabase-auth: token utilities only, no color literals
export function SignOutButton() {
  const [signingOut, startSignOut] = useTransition();
  const [signOutFailed, setSignOutFailed] = useState(false);

  function signOut() {
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

  return (
    <div className="flex items-center gap-3 text-sm">
      {signOutFailed && (
        // Inline text: a boxed Alert would break the header row.
        <p role="alert" className="font-medium text-danger">
          {SIGN_OUT_FAILED_MESSAGE}
        </p>
      )}
      <Button variant="ghost" onClick={signOut} disabled={signingOut}>
        Sign out
      </Button>
    </div>
  );
}

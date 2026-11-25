import { Suspense } from "react";

import { GOOGLE_HINT, GOOGLE_SEPARATOR_LABEL } from "../../model/auth-messages";
import { GoogleSignInButton } from "../GoogleSignInButton/GoogleSignInButton";
import { GoogleSignInButtonWithError } from "../GoogleSignInButtonWithError/GoogleSignInButtonWithError";

import type { GoogleSignInPanelProps } from "./GoogleSignInPanel.types";

/**
 * The "or" separator (`GOOGLE_SEPARATOR_LABEL`) and the Google button with the URL's notice as its `initialError`. `error` is request-time
 * data, so it is awaited only inside a Suspense boundary whose fallback is the same button without one, and the
 * static shell already holds a usable button (google-sign-in design D6). The hint under the button is static text,
 * outside the boundary: it depends on neither the address nor a failure (password-recovery FR-14).
 */
export function GoogleSignInPanel({ from, error }: GoogleSignInPanelProps) {
  return (
    <>
      <div className="flex items-center gap-3 text-sm text-muted">
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
        {GOOGLE_SEPARATOR_LABEL}
        <span aria-hidden="true" className="h-px flex-1 bg-border" />
      </div>
      <div className="flex flex-col gap-3">
        <Suspense fallback={<GoogleSignInButton from={from} />}>
          <GoogleSignInButtonWithError from={from} error={error} />
        </Suspense>
        <p className="text-sm text-muted">{GOOGLE_HINT[from]}</p>
      </div>
    </>
  );
}

import "server-only";

import type { GoogleCallbackParams, GoogleSignInResult } from "../model/auth.types";

/**
 * Finishes a Google sign-in: exchanges the callback's `code` for a session, or classifies its `error`.
 * Never throws. Stays in `dal/`, never `actions/`: a `"use server"` export would be a publicly callable
 * endpoint (google-sign-in design D3).
 */
export async function finishGoogleSignIn(params: GoogleCallbackParams): Promise<GoogleSignInResult> {
  void params;
  throw new Error("not implemented");
}

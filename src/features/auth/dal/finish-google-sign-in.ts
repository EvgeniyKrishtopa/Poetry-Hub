import "server-only";

import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import type { GoogleCallbackParams, GoogleFailureReason, GoogleSignInResult } from "../model/auth.types";
import { classifyGoogleCallbackError } from "../model/classify-google-callback-error";
import { didAccountExist } from "../model/did-account-exist";
import { getGoogleLogLine } from "../model/google-log-line";

/** A refusal ends without a session. A cancel is the visitor's own choice and logs nothing (NFR-G1). */
function refuse(reason: GoogleFailureReason, errorCode: string | null | undefined): GoogleSignInResult {
  if (reason !== "cancelled") {
    const line = getGoogleLogLine(reason, errorCode);
    console.error(line);
  }
  return { ok: false, reason };
}

/** The exchange's own error, classified like the callback's parameters: only its code is read, never its text. */
function refuseExchange(errorCode: string | undefined): GoogleSignInResult {
  const reason = classifyGoogleCallbackError({ error: null, errorCode: errorCode ?? null, errorDescription: null });
  return refuse(reason, errorCode);
}

/** The name of whatever the exchange threw: a class name, never a message that could hold the code or a token. */
function thrownName(error: unknown): string {
  return error instanceof Error ? error.name : typeof error;
}

/**
 * Finishes a Google sign-in: exchanges the callback's `code` for a session, or classifies its `error`.
 * On success the server client's `setAll` has written the session cookies. Never throws: a missing config
 * or an outage is `failed`. Stays in `dal/`, never `actions/`: a `"use server"` export would be a publicly
 * callable endpoint (google-sign-in design D3).
 */
export async function finishGoogleSignIn(params: GoogleCallbackParams): Promise<GoogleSignInResult> {
  if (params.error !== null) {
    const reason = classifyGoogleCallbackError(params);
    return refuse(reason, params.errorCode);
  }

  if (params.code === null || params.code === "") return refuse("failed", null);

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) return refuseExchange(error.code);

    const accountExisted = didAccountExist(data.user);
    return { ok: true, accountExisted };
  } catch (error) {
    // A missing config (SupabaseConfigError) or an outage: logged by class name only.
    const name = thrownName(error);
    return refuse("failed", name);
  }
}

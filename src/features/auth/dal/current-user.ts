import "server-only";

import { redirect } from "next/navigation";
import { connection } from "next/server";

import { SIGN_IN_PATH } from "@/shared/config/account-paths";
import { SESSION_STATE } from "@/shared/config/constants";
import { SupabaseConfigError } from "@/shared/lib/supabase";
import { type ClaimsState, readClaimsState } from "@/shared/lib/supabase/claims";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

/** A session check that found a valid session, or couldn't tell; signed-out already redirected. */
export type RequiredSession = Exclude<ClaimsState, { state: typeof SESSION_STATE.signedOut }>;

/**
 * What the request's session check found: signed in (with the user id), signed out, or unknown when
 * Supabase is unreachable, failing, or not configured (design D9, FR-20). The one place that decides
 * "who is signed in" for rendering and actions (design D1). Never throws.
 */
export async function getSessionState(): Promise<ClaimsState> {
  // First and outside the try: without it, a build with no Supabase env would throw the config
  // error before `cookies()`, resolve during prerender, and bake the result into the shell.
  await connection();

  try {
    const supabase = await createSupabaseServerClient();
    return readClaimsState(await supabase.auth.getClaims());
  } catch (error) {
    // The proxy already logs a missing config on every request. Anything else is an outage,
    // logged by name only.
    if (!(error instanceof SupabaseConfigError)) {
      console.error(`[auth] session check failed: ${error instanceof Error ? error.name : typeof error}`);
    }
    return { state: SESSION_STATE.unknown };
  }
}

/** The signed-in user's id, or `null` for anything else, unknown included. */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getSessionState();
  return session.state === SESSION_STATE.signedIn ? session.userId : null;
}

/**
 * The page gate (NFR-2): redirects a signed-out request to `/login`, and returns a signed-in session
 * or `unknown`, which the page shows as "service unavailable" instead of redirecting (FR-20).
 */
export async function requireSession(): Promise<RequiredSession> {
  const session = await getSessionState();
  // Outside any `try`, so `NEXT_REDIRECT` is never swallowed (design D10).
  if (session.state === SESSION_STATE.signedOut) redirect(SIGN_IN_PATH);
  return session;
}

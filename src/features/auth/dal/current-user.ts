import "server-only";

import { redirect } from "next/navigation";
import { connection } from "next/server";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

const SIGN_IN_PATH = "/login";

/**
 * The signed-in user's id from the session claims, or `null`. The one place that decides
 * "who is signed in" (design D1). Never throws: every failure reads as signed out.
 */
export async function getCurrentUserId(): Promise<string | null> {
  // First and outside the try: without it, a build with no Supabase env would throw the config
  // error before `cookies()`, resolve `null` during prerender, and bake "signed out" into the shell.
  await connection();

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getClaims();
    // An error result (an expired or bad token) is routine, so it isn't logged.
    if (error) return null;
    const sub = data?.claims?.sub;
    return typeof sub === "string" && sub !== "" ? sub : null;
  } catch (error) {
    // The proxy already logs a missing config on every request. Anything else is an outage,
    // logged by name only.
    if (!(error instanceof SupabaseConfigError)) {
      console.error(`[auth] session check failed: ${error instanceof Error ? error.name : typeof error}`);
    }
    return null;
  }
}

/** The signed-in user's id; redirects to `/login` when there is none. */
export async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  // Outside any `try`, so `NEXT_REDIRECT` is never swallowed (design D10).
  if (userId === null) redirect(SIGN_IN_PATH);
  return userId;
}

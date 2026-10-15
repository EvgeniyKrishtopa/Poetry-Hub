import "server-only";

import { connection } from "next/server";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

/**
 * Whether the request carries a valid session, for the header (design D1). Returns a boolean,
 * never claims, so no reader data enters the render tree. Never throws: every failure reads
 * as signed out.
 */
export async function isSignedIn(): Promise<boolean> {
  // First and outside the try: without it, a build with no Supabase env would throw the config
  // error before `cookies()`, resolve `false` during prerender, and bake "Sign in" into the shell.
  await connection();

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getClaims();
    // An error result (an expired or bad token) is routine, so it isn't logged.
    const claims = data?.claims;
    const hasClaims = claims !== undefined && claims !== null;
    return !error && hasClaims;
  } catch (error) {
    // The proxy already logs a missing config on every request. Anything else is an outage,
    // logged by name only.
    if (!(error instanceof SupabaseConfigError)) {
      console.error(`[auth] session check failed: ${error instanceof Error ? error.name : typeof error}`);
    }
    return false;
  }
}

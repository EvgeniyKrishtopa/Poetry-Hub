import "server-only";

import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { SESSION_STATE } from "@/shared/config/constants";

import { readClaimsState, type SessionState } from "./claims";
import { getSupabaseConfig } from "./config";
import { SupabaseConfigError } from "./errors";

/** A response that sets a session cookie, or depends on the session, must never be shared by a cache. */
export const SESSION_CACHE_CONTROL = "private, no-store";

export interface SessionRefresh {
  /** The response to continue with, carrying any refreshed or cleared session cookies. */
  readonly response: NextResponse;
  /** What the refresh's own `getClaims()` call found; routing only, never rendering (design D9). */
  readonly session: SessionState;
}

/**
 * Refreshes the Supabase session for the proxy and reports what it found (auth FR-6).
 * Never throws: a Supabase outage or a bad config must not take every page down (design D4).
 */
export async function refreshSession(request: NextRequest): Promise<SessionRefresh> {
  let config;
  try {
    config = getSupabaseConfig();
  } catch (error) {
    if (!(error instanceof SupabaseConfigError)) throw error;
    console.error(`[supabase] invalid configuration: ${error.variables.join(", ")}`);
    return { response: NextResponse.next(), session: SESSION_STATE.unknown };
  }

  // Built before `setAll` can touch `request.cookies`, so it forwards the cookies as received.
  const unrefreshed = NextResponse.next({ request });
  let response = unrefreshed;
  let wroteCookies = false;
  const cacheHeaders: Record<string, string> = {};

  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        // The library sends its cache headers only with the first write; keep them for later ones.
        Object.assign(cacheHeaders, headers);
        for (const [name, value] of Object.entries(cacheHeaders)) response.headers.set(name, value);
        if (cookiesToSet.length > 0) wroteCookies = true;
      },
    },
  });

  let session: SessionState;
  try {
    // A resolved `{ error }` (e.g. a revoked refresh token) is not a failure: `setAll` has
    // already cleared the dead session on `response`.
    session = readClaimsState(await supabase.auth.getClaims()).state;
  } catch {
    // Network failure or similar: continue un-refreshed, without logging the error's payload.
    return { response: unrefreshed, session: SESSION_STATE.unknown };
  }

  if (wroteCookies) response.headers.set("Cache-Control", SESSION_CACHE_CONTROL);
  return { response, session };
}

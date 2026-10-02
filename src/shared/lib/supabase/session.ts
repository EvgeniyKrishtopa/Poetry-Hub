import "server-only";

import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getSupabaseConfig } from "./config";
import { SupabaseConfigError } from "./errors";

/** A response that sets a session cookie must never be shared by a cache. */
const SESSION_CACHE_CONTROL = "private, no-store";

/**
 * Refreshes the Supabase session for the proxy and returns the response to continue with.
 * Never throws: a Supabase outage or a bad config must not take every page down (design D4).
 */
// implements FR-6 of add-supabase-auth
// implements FR-8 of add-supabase-auth
export async function refreshSession(request: NextRequest): Promise<NextResponse> {
  let config;
  try {
    config = getSupabaseConfig();
  } catch (error) {
    if (!(error instanceof SupabaseConfigError)) throw error;
    console.error(`[supabase] invalid configuration: ${error.variables.join(", ")}`);
    return NextResponse.next();
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
        wroteCookies ||= cookiesToSet.length > 0;
      },
    },
  });

  try {
    // A resolved `{ error }` (e.g. a revoked refresh token) is not a failure: `setAll` has
    // already cleared the dead session on `response`.
    await supabase.auth.getClaims();
  } catch {
    // Network failure or similar: continue un-refreshed, without logging the error's payload.
    return unrefreshed;
  }

  if (wroteCookies) response.headers.set("Cache-Control", SESSION_CACHE_CONTROL);
  return response;
}

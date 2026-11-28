import { type NextRequest, NextResponse } from "next/server";

import { isAccountPath, SIGN_IN_PATH } from "@/shared/config/account-paths";
import { SESSION_STATE } from "@/shared/config/constants";
import { SupabaseConfigError } from "@/shared/lib/supabase";
import { getSupabaseConfig } from "@/shared/lib/supabase/config";
import { refreshSession, SESSION_CACHE_CONTROL } from "@/shared/lib/supabase/session";

export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
} as const;

const CONTENT_SECURITY_POLICY_HEADER = "Content-Security-Policy";

/** Google sign-in's destination, allowed (with Supabase) should its start ever become a native form post. */
const GOOGLE_ACCOUNTS_ORIGIN = "https://accounts.google.com";

/** `null` on an invalid configuration, which `refreshSession` already logs. */
function readSupabaseOrigin(): string | null {
  try {
    const { url } = getSupabaseConfig();
    return new URL(url).origin;
  } catch (error) {
    if (!(error instanceof SupabaseConfigError)) throw error;
    return null;
  }
}

/**
 * The baseline policy: only the directives that need no nonce (docs/decisions/0023). Today's forms are
 * submitted by client functions, so `form-action` governs only a native post, an injected form included.
 */
function buildContentSecurityPolicy(): string {
  const supabaseOrigin = readSupabaseOrigin();
  const formTargets = ["'self'", supabaseOrigin, GOOGLE_ACCOUNTS_ORIGIN].filter((target) => target !== null);
  const formAction = `form-action ${formTargets.join(" ")}`;
  const directives = ["object-src 'none'", "base-uri 'none'", "frame-ancestors 'none'", formAction];

  return directives.join("; ");
}

/** Page requests; a Server Action is a POST to the page's path. */
const PAGE_REQUEST_METHODS: ReadonlySet<string> = new Set(["GET", "HEAD"]);

/** The header Next sets on every Server Action call. */
const SERVER_ACTION_HEADER = "Next-Action";

const TEMPORARY_REDIRECT = 307;

/** Sets SECURITY_HEADERS and the content security policy on the response and returns it. */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(name, value);
  }
  const contentSecurityPolicy = buildContentSecurityPolicy();
  response.headers.set(CONTENT_SECURITY_POLICY_HEADER, contentSecurityPolicy);
  return response;
}

/**
 * A signed-out page request under `/account` (add-author-profiles FR-19). Never a Server Action,
 * so an expired session still gets the action's own field error; never `unknown`, which fails open.
 */
function isSignedOutAccountPageRequest(request: NextRequest, session: string): boolean {
  return (
    session === SESSION_STATE.signedOut &&
    isAccountPath(request.nextUrl.pathname) &&
    PAGE_REQUEST_METHODS.has(request.method) &&
    !request.headers.has(SERVER_ACTION_HEADER)
  );
}

/** The 307 to `/login`, carrying the refresh's cookies (a dead session's clearing included). */
function redirectToSignIn(request: NextRequest, refreshed: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(new URL(SIGN_IN_PATH, request.url), TEMPORARY_REDIRECT);
  for (const cookie of refreshed.cookies.getAll()) redirect.cookies.set(cookie);
  // It depends on the session, cookies or not, so no shared cache may keep it.
  redirect.headers.set("Cache-Control", SESSION_CACHE_CONTROL);
  return redirect;
}

/**
 * Refreshes the Supabase session first; a signed-out page request under `/account` is then sent to
 * `/login` before anything renders (an optimistic layer: each page still checks the session itself,
 * NFR-2). The security headers go on last, so every response carries them (design D4, D9).
 */
export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { response, session } = await refreshSession(request);
  const next = isSignedOutAccountPageRequest(request, session) ? redirectToSignIn(request, response) : response;
  return applySecurityHeaders(next);
}

export const config = {
  // Skips Next's static assets, images, the favicon, and any path containing a dot.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

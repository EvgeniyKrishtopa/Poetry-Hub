import { type NextRequest, NextResponse } from "next/server";

import { isAccountPath, SIGN_IN_PATH } from "@/shared/config/account-paths";
import { SESSION_STATE } from "@/shared/config/constants";
import { refreshSession, SESSION_CACHE_CONTROL } from "@/shared/lib/supabase/session";

export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
} as const;

/** Page requests; a Server Action is a POST to the page's path. */
const PAGE_REQUEST_METHODS: ReadonlySet<string> = new Set(["GET", "HEAD"]);

/** The header Next sets on every Server Action call. */
const SERVER_ACTION_HEADER = "Next-Action";

const TEMPORARY_REDIRECT = 307;

/** Sets SECURITY_HEADERS on the response and returns it. */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(name, value);
  }
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

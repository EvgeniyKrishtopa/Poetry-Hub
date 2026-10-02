// implements FR-8 of add-contentful-home-greeting
import type { NextRequest, NextResponse } from "next/server";

import { refreshSession } from "@/shared/lib/supabase/session";

export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
} as const;

/** Sets SECURITY_HEADERS on the response and returns it. */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(name, value);
  }
  return response;
}

/**
 * Refreshes the Supabase session first, then sets the security headers last so every
 * response carries them, refreshed or not (design D4).
 */
// implements FR-6 of add-supabase-auth
export async function proxy(request: NextRequest): Promise<NextResponse> {
  return applySecurityHeaders(await refreshSession(request));
}

export const config = {
  // Skips Next's static assets, images, the favicon, and any path containing a dot.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

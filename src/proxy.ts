import { NextResponse, type NextRequest } from "next/server";

export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
} as const;

/**
 * Sets SECURITY_HEADERS on page responses.
 * Scaffold: passes through instead of throwing, because the proxy runs on every request.
 */
export function proxy(request: NextRequest): NextResponse {
  return NextResponse.next();
}

export const config = {
  // Skips Next's static assets, images, the favicon, and any path containing a dot.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

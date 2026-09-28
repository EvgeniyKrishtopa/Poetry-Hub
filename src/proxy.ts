// implements FR-8 of add-contentful-home-greeting
import { NextResponse } from "next/server";

export const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
} as const;

/** Sets SECURITY_HEADERS on every response the matcher lets through. */
export function proxy(): NextResponse {
  const response = NextResponse.next();
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(name, value);
  }
  return response;
}

export const config = {
  // Skips Next's static assets, images, the favicon, and any path containing a dot.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};

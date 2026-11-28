import "server-only";

import type { CookieOptionsWithName } from "@supabase/ssr";

/**
 * The options every auth cookie is written with, shared by both server clients. The library lays them over its
 * defaults on every write, removals and chunks included. No browser Supabase client exists, so page scripts
 * never need to read these cookies. `Secure` only in production, because local development runs on plain http.
 */
export function getSessionCookieOptions(): CookieOptionsWithName {
  const isProduction = process.env.NODE_ENV === "production";

  return { httpOnly: true, sameSite: "lax", secure: isProduction };
}

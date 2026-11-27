import "server-only";

import type { CookieOptionsWithName } from "@supabase/ssr";

/** The options every auth cookie is written with, shared by both server clients. */
export function getSessionCookieOptions(): CookieOptionsWithName {
  throw new Error("not implemented");
}

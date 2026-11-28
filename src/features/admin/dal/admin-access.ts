import "server-only";

import { cache } from "react";

import type { SESSION_STATE } from "@/shared/config/constants";
import type { ClaimsState } from "@/shared/lib/supabase/claims";

import { checkIsAdmin } from "./admin-check";

/**
 * What the admin check found: an admin who verified the second factor, an admin who still has to, a reader who is not
 * an admin, or no answer (outage). Never "not an admin" by default.
 */
export type AdminAccess = "admin" | "needs-second-factor" | "not-admin" | "unavailable";

/** A session a caller may ask about: a signed-in one, or one that couldn't be read. Signed-out callers never ask. */
export type AskableSession = Exclude<ClaimsState, { readonly state: typeof SESSION_STATE.signedOut }>;

type AssuranceLevel = Extract<ClaimsState, { readonly state: typeof SESSION_STATE.signedIn }>["aal"];

// Wrapped in React's `cache()`, keyed by the level (a string, so every caller of a request shares one entry): the
// page gate, the header link and the breadcrumb slot get one `is_admin()` call and one answer, and cannot disagree.
const readAccessAtLevel = cache(async (aal: AssuranceLevel): Promise<AdminAccess> => {
  const admin = await checkIsAdmin();
  if (!admin.ok) return "unavailable";
  if (!admin.isAdmin) return "not-admin";
  return aal === "aal2" ? "admin" : "needs-second-factor";
});

/**
 * The one reading of "may this request use the admin tools" (design D9, D13, D14). An unreadable session or admin check
 * is `unavailable`, never "not an admin" and never "needs the second factor"; the database is asked only for a
 * signed-in reader. The database enforces `aal2` itself; this answer decides what the app offers.
 */
export async function readAdminAccess(session: AskableSession): Promise<AdminAccess> {
  if (session.state === "unknown") return "unavailable";
  return readAccessAtLevel(session.aal);
}

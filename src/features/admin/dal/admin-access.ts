import "server-only";

import type { SESSION_STATE } from "@/shared/config/constants";

import { checkIsAdmin } from "./admin-check";

/** What the admin check found: an admin, a reader who is not one, or no answer (outage). Never "not an admin" by default. */
export type AdminAccess = "admin" | "not-admin" | "unavailable";

/** A session a caller may ask about: a signed-in one, or one that couldn't be read. Signed-out callers never ask. */
export type AskableSession = typeof SESSION_STATE.signedIn | typeof SESSION_STATE.unknown;

/**
 * The one reading of "may this request use the admin tools" the page gate and the header link share (design D9, D13).
 * An unreadable session or admin check is `unavailable`; the database is asked only for a signed-in reader.
 */
export async function readAdminAccess(session: AskableSession): Promise<AdminAccess> {
  if (session === "unknown") return "unavailable";

  const admin = await checkIsAdmin();
  if (!admin.ok) return "unavailable";
  return admin.isAdmin ? "admin" : "not-admin";
}

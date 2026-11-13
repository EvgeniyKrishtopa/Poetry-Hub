import "server-only";

import type { AdminCheckResult, ModerateCheckResult } from "../model/admin.types";

/** Calls `is_admin()` for the signed-in caller; an unreadable answer is a failure, never "not an admin" (design D1). */
export async function checkIsAdmin(): Promise<AdminCheckResult> {
  throw new Error("not implemented");
}

/** Calls `may_moderate_author(author_profile_id)`: an admin who is not the profile's owner (design D8, FR-10). */
export async function checkMayModerateAuthor(authorProfileId: string): Promise<ModerateCheckResult> {
  void authorProfileId;
  throw new Error("not implemented");
}

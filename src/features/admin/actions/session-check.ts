import "server-only";

import type { SessionCheck } from "../model/admin.types";

/**
 * The session step every action shares; the feature's own copy over `auth`'s public API. A gone session is
 * `unauthenticated`, one that can't be checked is `unavailable`, never "expired".
 */
export async function checkSession(): Promise<SessionCheck> {
  throw new Error("not implemented");
}

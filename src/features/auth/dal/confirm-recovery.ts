import "server-only";

import type { ConfirmOutcome } from "../model/auth.types";

/**
 * Verifies a recovery link. On success the server client's `setAll` has written the session cookies. Never throws:
 * every failure reads as `"failed"`. Stays in `dal/`, never `actions/`: a `"use server"` export would be a publicly
 * callable endpoint (password-recovery design D1).
 */
export async function confirmRecovery(tokenHash: string | null, type: string | null): Promise<ConfirmOutcome> {
  void tokenHash;
  void type;
  throw new Error("not implemented");
}

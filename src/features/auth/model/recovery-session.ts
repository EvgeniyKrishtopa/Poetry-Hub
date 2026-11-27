import type { AmrEntry } from "@/shared/lib/supabase/claims";

/** Whether the session was opened by a recovery link recently enough to set a new password. */
export function isRecentRecoverySession(amr: readonly AmrEntry[], nowSeconds: number): boolean {
  void amr;
  void nowSeconds;
  throw new Error("not implemented");
}

import type { AmrEntry } from "@/shared/lib/supabase/claims";

import { RECOVERY_AMR_METHODS, RECOVERY_SESSION_WINDOW_SECONDS } from "./auth.constants";

/** Whether the session was opened by a recovery link recently enough to set a new password. */
export function isRecentRecoverySession(amr: readonly AmrEntry[], nowSeconds: number): boolean {
  return amr.some(({ method, timestamp }) => {
    const ageSeconds = nowSeconds - timestamp;
    return RECOVERY_AMR_METHODS.has(method) && ageSeconds <= RECOVERY_SESSION_WINDOW_SECONDS;
  });
}

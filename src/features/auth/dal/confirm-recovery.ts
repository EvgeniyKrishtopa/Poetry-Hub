import "server-only";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import type { ConfirmOutcome } from "../model/auth.types";
import { recoveryParamsSchema } from "../model/confirm-params.schema";

/**
 * Verifies a recovery link. On success the server client's `setAll` has written the session cookies. Never throws:
 * every failure reads as `"failed"`. Stays in `dal/`, never `actions/`: a `"use server"` export would be a publicly
 * callable endpoint (password-recovery design D1).
 */
export async function confirmRecovery(tokenHash: string | null, type: string | null): Promise<ConfirmOutcome> {
  const params = recoveryParamsSchema.safeParse({ token_hash: tokenHash, type });
  if (!params.success) return "failed";

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp(params.data);
    return error ? "failed" : "verified";
  } catch (error) {
    // The proxy already logs a missing config on every request. Anything else is an outage, logged by name only so
    // it stays distinguishable from a bad link without leaking the token.
    if (!(error instanceof SupabaseConfigError)) {
      console.error(`[auth] recovery link verification failed: ${error instanceof Error ? error.name : typeof error}`);
    }
    return "failed";
  }
}

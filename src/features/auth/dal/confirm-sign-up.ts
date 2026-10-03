import "server-only";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { confirmParamsSchema } from "../model/confirm-params.schema";

/**
 * Verifies a sign-up confirmation link. On success the server client's `setAll` has written
 * the session cookies. Never throws: every failure reads as `"failed"`, so the reader always
 * lands on `/login` with a next step (design D3). Stays in `dal/`, never `actions/`: a
 * `"use server"` export would be a publicly callable endpoint.
 */
// implements FR-5 of add-supabase-auth
// implements FR-8 of add-supabase-auth
export async function confirmSignUp(
  tokenHash: string | null,
  type: string | null,
): Promise<"confirmed" | "failed"> {
  const params = confirmParamsSchema.safeParse({ token_hash: tokenHash, type });
  if (!params.success) return "failed";

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp(params.data);
    return error ? "failed" : "confirmed";
  } catch (error) {
    // The proxy already logs a missing config on every request. Anything else is an outage,
    // logged by name only so it stays distinguishable from a bad link without leaking the token.
    if (!(error instanceof SupabaseConfigError)) {
      console.error(`[auth] email confirmation failed: ${error instanceof Error ? error.name : typeof error}`);
    }
    return "failed";
  }
}

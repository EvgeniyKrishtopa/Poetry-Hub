import "server-only";

import { POEM_ILLUSTRATIONS_BUCKET } from "@/features/poems";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { logFailure } from "./rpc-failure";

const CLEANUP_OPERATION = "remove illustration";

/**
 * Removes a deleted poem's illustration file with the admin's own session (design D11): the bucket's admin policy lets
 * that session delete another author's file. A failure is only logged by kind and never undoes the delete, so this
 * never throws. Storage answers a refused delete as an empty success, not an error, which is why the policy matters.
 */
export async function removeIllustration(illustrationPath: string): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.storage.from(POEM_ILLUSTRATIONS_BUCKET).remove([illustrationPath]);
    if (error) logFailure(CLEANUP_OPERATION, error);
  } catch (error) {
    logFailure(CLEANUP_OPERATION, error);
  }
}

import "server-only";

import { POEM_ILLUSTRATIONS_BUCKET } from "@/features/poems";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { logFailure } from "./write-log";

const CLEANUP_OPERATION = "remove illustration";

/**
 * Removes an illustration no poem points at: an upload whose create failed, or a deleted poem's file. A
 * failure is only logged; an orphan file is a known risk (design Risks), never an error for the author.
 */
export async function removeIllustrationBestEffort(path: string): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.storage.from(POEM_ILLUSTRATIONS_BUCKET).remove([path]);
    if (error) logFailure(CLEANUP_OPERATION, error);
  } catch (error) {
    logFailure(CLEANUP_OPERATION, error);
  }
}

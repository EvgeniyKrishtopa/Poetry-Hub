import "server-only";

import { z } from "zod";

import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import type {
  SaveOwnCollectionPoemsInput,
  SaveOwnCollectionPoemsResult,
} from "../model/collection-management.types";

import { toServiceFailure, withStatus } from "./write-log";

const SAVE_OPERATION = "save collection poems";

/** `save_my_collection_poems()`'s answer; any other shape fails the parse and is `unknown`, never a guessed save. */
const saveStatusSchema = z.object({ status: z.enum(["saved", "stale", "not-found"]) });

/**
 * Calls `save_my_collection_poems()` as the signed-in owner: the whole change or nothing; never throws. The
 * database resolves the owner from the session, so another author's collection and an unknown id are both
 * `not-found`; a rejected JWT classifies as `unauthenticated` (add-poems-to-collections D2, D6).
 */
export async function saveOwnCollectionPoems(input: SaveOwnCollectionPoemsInput): Promise<SaveOwnCollectionPoemsResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const response = await supabase.rpc("save_my_collection_poems", {
      collection_id: input.collectionId,
      added: input.added,
      removed: input.removed,
    });
    if (response.error) {
      return { ok: false, failure: toServiceFailure(SAVE_OPERATION, withStatus(response.error, response.status)) };
    }

    const parsed = saveStatusSchema.safeParse(response.data);
    if (!parsed.success) return { ok: false, failure: toServiceFailure(SAVE_OPERATION, parsed.error) };
    return { ok: true, status: parsed.data.status };
  } catch (error) {
    // A config error, or an unexpected throw (a network failure): still a value.
    return { ok: false, failure: toServiceFailure(SAVE_OPERATION, error) };
  }
}

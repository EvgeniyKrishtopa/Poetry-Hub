import "server-only";

import { z } from "zod";

import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import type { DeleteOwnPoemResult } from "../model/poem-management.types";

import { toServiceFailure, withStatus } from "./write-log";

const DELETE_OPERATION = "delete poem";

/** `delete_my_poem()`'s answer; any other shape fails the parse and is `unknown`, never a guessed success. */
const deleteStatusSchema = z.union([
  z.object({ status: z.literal("deleted"), author_id: z.uuid(), illustration_path: z.string().nullable() }),
  z.object({ status: z.literal("not-found") }),
]);

/**
 * `delete_my_poem(poemId)` as the signed-in owner: the database resolves the owner from the session, so
 * another author's poem and an unknown id are both `not-found` (design D2, D3). A failure is a value, never
 * a throw; a rejected JWT classifies as `unauthenticated`. Log lines carry the failure kind only (NFR-10).
 */
export async function deleteOwnPoem(poemId: string): Promise<DeleteOwnPoemResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const response = await supabase.rpc("delete_my_poem", { poem_id: poemId });
    if (response.error) {
      return { ok: false, failure: toServiceFailure(DELETE_OPERATION, withStatus(response.error, response.status)) };
    }

    const parsed = deleteStatusSchema.safeParse(response.data);
    if (!parsed.success) return { ok: false, failure: toServiceFailure(DELETE_OPERATION, parsed.error) };
    if (parsed.data.status === "not-found") return { ok: true, status: "not-found" };
    return {
      ok: true,
      status: "deleted",
      authorId: parsed.data.author_id,
      illustrationPath: parsed.data.illustration_path,
    };
  } catch (error) {
    // A config error, or an unexpected throw (a network failure): still a value.
    return { ok: false, failure: toServiceFailure(DELETE_OPERATION, error) };
  }
}

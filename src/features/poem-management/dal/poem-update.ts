import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { ILLUSTRATION_CHANGE } from "../model/poem-management.constants";
import type { ServiceFailure, UpdateOwnPoemInput, UpdateOwnPoemResult } from "../model/poem-management.types";

import { removeIllustrationBestEffort } from "./illustration-cleanup";
import { uploadIllustration } from "./poem-writes";
import { toServiceFailure, withStatus } from "./write-log";

// Runs with the cookie client as the signed-in owner; the database resolves the owner from the session, so
// another author's poem and an unknown id are both `not-found` (design D2). Log lines carry the operation and
// the failure kind only, never a title, text, id, or path (NFR-5, `write-log.ts`).

const UPDATE_OPERATION = "update poem";

/** `update_my_poem()`'s answer; any other shape fails the parse and is `unknown`, never a guessed success. */
const updateStatusSchema = z.union([
  z.object({ status: z.literal("updated"), author_id: z.uuid(), replaced_path: z.string().nullable() }),
  z.object({ status: z.literal("not-found") }),
]);

type WriteResult =
  | { readonly ok: true; readonly status: "updated"; readonly authorId: string; readonly replacedPath: string | null }
  | { readonly ok: true; readonly status: "not-found" }
  | { readonly ok: false; readonly failure: ServiceFailure };

/** `update_my_poem()`: `keep_illustration` leaves the stored path; otherwise the new path, or `null` to remove. */
async function writePoem(
  supabase: SupabaseClient,
  input: UpdateOwnPoemInput,
  illustrationPath: string | null,
): Promise<WriteResult> {
  try {
    const response = await supabase.rpc("update_my_poem", {
      poem_id: input.poemId,
      title: input.title,
      text: input.text,
      genre_id: input.genreId,
      keep_illustration: input.illustration.kind === ILLUSTRATION_CHANGE.keep,
      illustration_path: illustrationPath,
    });
    if (response.error) {
      return { ok: false, failure: toServiceFailure(UPDATE_OPERATION, withStatus(response.error, response.status)) };
    }

    const parsed = updateStatusSchema.safeParse(response.data);
    if (!parsed.success) return { ok: false, failure: toServiceFailure(UPDATE_OPERATION, parsed.error) };
    if (parsed.data.status === "not-found") return { ok: true, status: "not-found" };
    return {
      ok: true,
      status: "updated",
      authorId: parsed.data.author_id,
      replacedPath: parsed.data.replaced_path,
    };
  } catch (error) {
    // An unexpected throw (a network failure): still a value.
    return { ok: false, failure: toServiceFailure(UPDATE_OPERATION, error) };
  }
}

/**
 * Uploads a replacement (if any), calls `update_my_poem` as the signed-in owner, and removes the new upload when
 * the row wasn't written; a failure is a value, never a throw (edit-poem design D2, D3). An upload failure calls
 * no RPC: the row never points at a file that isn't there.
 */
export async function updateOwnPoem(input: UpdateOwnPoemInput): Promise<UpdateOwnPoemResult> {
  let supabase: SupabaseClient;
  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    return { ok: false, failure: toServiceFailure(UPDATE_OPERATION, error) };
  }

  let uploadedPath: string | null = null;
  if (input.illustration.kind === ILLUSTRATION_CHANGE.replace) {
    const upload = await uploadIllustration(supabase, input.authorId, input.illustration.file);
    if (!upload.ok) return upload;
    uploadedPath = upload.path;
  }

  const written = await writePoem(supabase, input, uploadedPath);
  if (!written.ok || written.status === "not-found") {
    if (uploadedPath !== null) await removeIllustrationBestEffort(uploadedPath);
    return written;
  }

  // The row is written and points at the upload, so the upload stays. A different author would expire the
  // wrong cache tag: the action gets `unknown` and expires nothing.
  if (written.authorId !== input.authorId) {
    console.error(`[poem-management] ${UPDATE_OPERATION} failed: author mismatch`);
    return { ok: false, failure: "unknown" };
  }
  return { ok: true, status: "updated", replacedPath: written.replacedPath };
}

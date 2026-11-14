import "server-only";

import { z } from "zod";

import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { DELETE_DB_STATUS } from "../model/admin.constants";
import { targetIdSchema, type DeleteTargetInput } from "../model/admin.schema";
import type { CollectionDeleteWriteResult, PoemDeleteWriteResult } from "../model/admin.types";

import { toAdminFailure, withStatus } from "./rpc-failure";

// The author is resolved by the database from the row itself (design D7), so nothing here takes an author id. The ids
// come back from the database, never from the browser, because they pick the cache tag to expire and the file to remove.
// A failure is a value, and a log line holds the operation and the failure kind only (NFR-6).

const DELETE_POEM_OPERATION = "delete poem";
const DELETE_COLLECTION_OPERATION = "delete collection";

/** `admin_delete_poem()`'s answer; a `deleted` answer without an author fails the parse as `unknown`. */
const poemAnswerSchema = z.union([
  z.object({
    status: z.literal(DELETE_DB_STATUS.deleted),
    author_id: targetIdSchema,
    illustration_path: z.string().min(1).nullable(),
  }),
  z.object({ status: z.literal(DELETE_DB_STATUS.notFound) }),
]);

/** `admin_delete_collection()`'s answer. */
const collectionAnswerSchema = z.union([
  z.object({ status: z.literal(DELETE_DB_STATUS.deleted), author_id: targetIdSchema, title: z.string().min(1) }),
  z.object({ status: z.literal(DELETE_DB_STATUS.notFound) }),
]);

/** Calls `admin_delete_poem`; the admin right is checked inside the database (design D2, D7). */
export async function deletePoemAsAdmin(input: DeleteTargetInput): Promise<PoemDeleteWriteResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const response = await supabase.rpc("admin_delete_poem", { poem_id: input.id });
    if (response.error) {
      return {
        ok: false,
        failure: toAdminFailure(DELETE_POEM_OPERATION, withStatus(response.error, response.status)),
      };
    }

    const parsed = poemAnswerSchema.safeParse(response.data);
    if (!parsed.success) return { ok: false, failure: toAdminFailure(DELETE_POEM_OPERATION, parsed.error) };
    if (parsed.data.status === DELETE_DB_STATUS.notFound) return { ok: true, status: DELETE_DB_STATUS.notFound };
    return {
      ok: true,
      status: DELETE_DB_STATUS.deleted,
      authorId: parsed.data.author_id,
      illustrationPath: parsed.data.illustration_path,
    };
  } catch (error) {
    return { ok: false, failure: toAdminFailure(DELETE_POEM_OPERATION, error) };
  }
}

/** Calls `admin_delete_collection`. */
export async function deleteCollectionAsAdmin(input: DeleteTargetInput): Promise<CollectionDeleteWriteResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const response = await supabase.rpc("admin_delete_collection", { collection_id: input.id });
    if (response.error) {
      return {
        ok: false,
        failure: toAdminFailure(DELETE_COLLECTION_OPERATION, withStatus(response.error, response.status)),
      };
    }

    const parsed = collectionAnswerSchema.safeParse(response.data);
    if (!parsed.success) return { ok: false, failure: toAdminFailure(DELETE_COLLECTION_OPERATION, parsed.error) };
    if (parsed.data.status === DELETE_DB_STATUS.notFound) return { ok: true, status: DELETE_DB_STATUS.notFound };
    return {
      ok: true,
      status: DELETE_DB_STATUS.deleted,
      authorId: parsed.data.author_id,
      title: parsed.data.title,
    };
  } catch (error) {
    return { ok: false, failure: toAdminFailure(DELETE_COLLECTION_OPERATION, error) };
  }
}

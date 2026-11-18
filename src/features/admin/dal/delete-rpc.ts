import "server-only";

import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { DELETE_DB_STATUS, DELETE_OPERATION } from "../model/admin.constants";
import type { DeleteTargetInput } from "../model/admin.schema";
import type { CollectionDeleteWriteResult, PoemDeleteWriteResult } from "../model/admin.types";
import { collectionAnswerSchema, poemAnswerSchema } from "../model/delete-rpc.schema";

import { toAdminFailure, withStatus } from "./rpc-failure";

// The author is resolved by the database from the row itself (design D7), so nothing here takes an author id. A
// failure is a value, and a log line holds the operation and the failure kind only (NFR-6).

/** Calls `admin_delete_poem`; the admin right is checked inside the database (design D2, D7). */
export async function deletePoemAsAdmin(input: DeleteTargetInput): Promise<PoemDeleteWriteResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const response = await supabase.rpc("admin_delete_poem", { poem_id: input.id });
    if (response.error) {
      return {
        ok: false,
        failure: toAdminFailure(DELETE_OPERATION.poem, withStatus(response.error, response.status)),
      };
    }

    const parsed = poemAnswerSchema.safeParse(response.data);
    if (!parsed.success) return { ok: false, failure: toAdminFailure(DELETE_OPERATION.poem, parsed.error) };
    if (parsed.data.status === DELETE_DB_STATUS.notFound) return { ok: true, status: DELETE_DB_STATUS.notFound };
    return {
      ok: true,
      status: DELETE_DB_STATUS.deleted,
      authorId: parsed.data.author_id,
      userId: parsed.data.user_id,
      illustrationPath: parsed.data.illustration_path,
      title: parsed.data.title,
      noticeEmail: parsed.data.notice_email,
      ground: parsed.data.ground,
    };
  } catch (error) {
    return { ok: false, failure: toAdminFailure(DELETE_OPERATION.poem, error) };
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
        failure: toAdminFailure(DELETE_OPERATION.collection, withStatus(response.error, response.status)),
      };
    }

    const parsed = collectionAnswerSchema.safeParse(response.data);
    if (!parsed.success) return { ok: false, failure: toAdminFailure(DELETE_OPERATION.collection, parsed.error) };
    if (parsed.data.status === DELETE_DB_STATUS.notFound) return { ok: true, status: DELETE_DB_STATUS.notFound };
    return {
      ok: true,
      status: DELETE_DB_STATUS.deleted,
      authorId: parsed.data.author_id,
      userId: parsed.data.user_id,
      title: parsed.data.title,
      noticeEmail: parsed.data.notice_email,
      ground: parsed.data.ground,
    };
  } catch (error) {
    return { ok: false, failure: toAdminFailure(DELETE_OPERATION.collection, error) };
  }
}

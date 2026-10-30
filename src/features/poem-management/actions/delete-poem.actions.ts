"use server";

import { getSessionState } from "@/features/auth";
import { SESSION_STATE } from "@/shared/config/constants";

import { removeIllustrationBestEffort } from "../dal/illustration-cleanup";
import { deleteOwnPoem } from "../dal/poem-delete";
import { logFailure } from "../dal/write-log";
import { deletePoemInputSchema, isPoemId } from "../model/delete-poem.schema";
import { DELETE_POEM_STATUS } from "../model/poem-management.constants";
import type { DeletePoemResult, ServiceFailure } from "../model/poem-management.types";

import { poemManagementActionClient } from "./action-client";
import { expirePoemsTag } from "./expire-poems-tag";

// The owner is resolved from the session by the database, never from input (NFR-1). Only a deleted poem
// expires a cache tag (FR-8). The client already has the title, so no poem data comes back.

const CLEANUP_OPERATION = "remove illustration";

const NOT_FOUND: DeletePoemResult = { status: DELETE_POEM_STATUS.notFound };

function failed(failure: ServiceFailure): DeletePoemResult {
  return { status: DELETE_POEM_STATUS.failed, failure };
}

/** The steps of design D3, in order; each failure stops the rest. */
async function deletePoem(poemId: string): Promise<DeletePoemResult> {
  // 1. A malformed id names no poem: no session read, no database call.
  if (!isPoemId(poemId)) return NOT_FOUND;

  // 2. Session. The proxy has already refreshed an expired access token (FR-7), so signed-out means the
  //    session is gone (FR-6); one that can't be checked gets the outage message, not "expired".
  const { state } = await getSessionState();
  if (state === SESSION_STATE.signedOut) return failed("unauthenticated");
  if (state !== SESSION_STATE.signedIn) return failed("unavailable");

  // 3. The delete; another author's poem and a missing one are the same not-found (FR-4).
  const result = await deleteOwnPoem(poemId);
  if (!result.ok) return failed(result.failure);
  if (result.status === "not-found") return NOT_FOUND;

  // 4. The row is gone: the author's pages must not list it. A failed expiry is only logged.
  expirePoemsTag(result.authorId);

  // 5. The file last: a row pointing at a missing file would show a broken image; a file with no row is
  //    invisible (clarify decision 2). Its failure is logged and changes nothing.
  if (result.illustrationPath !== null) await removeFileAfterDelete(result.illustrationPath);

  return { status: DELETE_POEM_STATUS.deleted };
}

/**
 * The helper already logs and swallows its own failures; this catch keeps the answer `deleted` even if that
 * ever changes, because the row is gone and an error would invite a pointless retry.
 */
async function removeFileAfterDelete(path: string): Promise<void> {
  try {
    await removeIllustrationBestEffort(path);
  } catch (error) {
    logFailure(CLEANUP_OPERATION, error);
  }
}

/** Deletes one of the caller's own poems by id (design D3). */
export const deletePoemAction = poemManagementActionClient
  .inputSchema(deletePoemInputSchema)
  .action(async ({ parsedInput }): Promise<DeletePoemResult> => deletePoem(parsedInput.poemId));

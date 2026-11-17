"use server";

import { deletePoemAsAdmin } from "../dal/delete-rpc";
import { removeIllustration } from "../dal/illustration-cleanup";
import { toFailureReason } from "../model/action-results";
import { DELETE_DB_STATUS } from "../model/admin.constants";
import { deleteTargetSchema } from "../model/admin.schema";
import type { DeleteActionResult } from "../model/admin.types";

import { adminActionClient } from "./action-client";
import { expireAuthorWorksTag } from "./expire-author-works-tag";
import { checkSession } from "./session-check";

/** The steps of design D8, in order; each failure stops the rest. */
async function deletePoem(poemId: string): Promise<DeleteActionResult> {
  // 1. The input is already validated by the schema: a malformed id never gets here (FR-12).

  // 2. Session, read again: an ended one and one that can't be checked are told apart.
  const session = await checkSession();
  if (!session.ok) return { ok: false, reason: session.failure };

  // 3. The delete; the database checks the admin right itself and resolves the author from the row (D2, D7).
  const result = await deletePoemAsAdmin({ id: poemId });
  if (!result.ok) return { ok: false, reason: toFailureReason(result.failure) };
  if (result.status === DELETE_DB_STATUS.notFound) return { ok: false, reason: "not-found" };

  // 4. The row is gone: the author's public pages must not list it. A failed expiry is only logged.
  expireAuthorWorksTag(result.authorId);

  // 5. The file last: the helper logs and swallows its own failures, so the delete stands whatever happens (D8, FR-8).
  if (result.illustrationPath !== null) await removeIllustration(result.illustrationPath);

  return { ok: true };
}

/** Deletes another user's poem, expires the author's works tag and removes the illustration best-effort (design D8, FR-8). */
export const deletePoemAction = adminActionClient
  .inputSchema(deleteTargetSchema)
  .action(async ({ parsedInput }): Promise<DeleteActionResult> => deletePoem(parsedInput.id));

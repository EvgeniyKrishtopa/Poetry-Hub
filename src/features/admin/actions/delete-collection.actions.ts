"use server";

import { deleteCollectionAsAdmin } from "../dal/delete-rpc";
import { toFailureReason } from "../model/action-results";
import { DELETE_DB_STATUS } from "../model/admin.constants";
import { deleteTargetSchema } from "../model/admin.schema";
import type { DeleteActionResult } from "../model/admin.types";
import { ACTION_NOTICE_KIND } from "../model/violation.constants";

import { adminActionClient } from "./action-client";
import { expireAuthorWorksTag } from "./expire-author-works-tag";
import { sendActionNotice } from "./send-action-notice";
import { checkSession } from "./session-check";

/** The same steps as the poem delete, without a file to remove (design D8). */
async function deleteCollection(collectionId: string): Promise<DeleteActionResult> {
  const session = await checkSession();
  if (!session.ok) return { ok: false, reason: session.failure };

  const result = await deleteCollectionAsAdmin({ id: collectionId });
  if (!result.ok) return { ok: false, reason: toFailureReason(result.failure) };
  if (result.status === DELETE_DB_STATUS.notFound) return { ok: false, reason: "not-found" };

  // The collection's poems are free poems now; the same tag covers the author's poems and collections.
  expireAuthorWorksTag(result.authorId);

  // The email last; it never decides the result (FR-9, FR-14). The title is the database's, never the browser's.
  const notice = await sendActionNotice({
    kind: ACTION_NOTICE_KIND.deleteCollection,
    userId: result.userId,
    email: result.noticeEmail,
    ground: result.ground,
    title: result.title,
  });

  return { ok: true, notice };
}

/** Deletes another user's collection and expires the author's works tag (FR-9). */
export const deleteCollectionAction = adminActionClient
  .inputSchema(deleteTargetSchema)
  .action(async ({ parsedInput }): Promise<DeleteActionResult> => deleteCollection(parsedInput.id));

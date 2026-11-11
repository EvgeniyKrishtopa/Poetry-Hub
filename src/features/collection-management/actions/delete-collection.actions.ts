"use server";

import { refresh } from "next/cache";

import { deleteOwnCollection } from "../dal/collection-writes";
import { deleteCollectionInputSchema, isCollectionId } from "../model/collection-form.schema";
import { DELETE_COLLECTION_STATUS } from "../model/collection-management.constants";
import type { DeleteCollectionResult, ServiceFailure } from "../model/collection-management.types";

import { collectionManagementActionClient } from "./action-client";
import { expireAuthorWorksTag } from "./expire-author-works-tag";
import { checkSession } from "./session-check";

// The owner is resolved from the session by the database, never from input (NFR-1). The deleted notice's title
// is the stored one the database returns. Only a deleted collection expires the public tag and refreshes the client
// router (design D4, D10).

const NOT_FOUND: DeleteCollectionResult = { status: DELETE_COLLECTION_STATUS.notFound };

function failed(failure: ServiceFailure): DeleteCollectionResult {
  return { status: DELETE_COLLECTION_STATUS.failed, failure };
}

/** The steps of design D7, in order; each failure stops the rest. */
async function deleteCollection(collectionId: string): Promise<DeleteCollectionResult> {
  // 1. A malformed id names no collection: no session read, no database call.
  if (!isCollectionId(collectionId)) return NOT_FOUND;

  // 2. Session.
  const session = await checkSession();
  if (!session.ok) return failed(session.failure);

  // 3. The delete; another author's collection and a missing one are the same not-found.
  const result = await deleteOwnCollection(collectionId);
  if (!result.ok) return failed(result.failure);
  if (result.status === "not-found") return NOT_FOUND;

  // 4. Gone: the public pages (the tag, whatever the profile's status now: cached entries can outlive a non-public
  //    spell) and the client router's copies of the author's pages must not list it.
  expireAuthorWorksTag(result.authorId);
  refresh();
  return { status: DELETE_COLLECTION_STATUS.deleted, title: result.title };
}

/** Deletes one of the caller's own collections (design D7). */
export const deleteCollectionAction = collectionManagementActionClient
  .inputSchema(deleteCollectionInputSchema)
  .action(async ({ parsedInput }): Promise<DeleteCollectionResult> => deleteCollection(parsedInput.collectionId));

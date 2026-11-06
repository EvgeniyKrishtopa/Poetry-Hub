"use server";

import { refresh } from "next/cache";

import { getOwnPublicAuthor } from "@/features/authors";

import { consumeCollectionEditAllowance } from "../dal/collection-edit-allowance";
import { updateOwnCollection } from "../dal/collection-writes";
import {
  collectionFormSchema,
  isCollectionId,
  toCollectionFieldErrors,
  type UpdateCollectionInput,
  updateCollectionInputSchema,
} from "../model/collection-form.schema";
import { UPDATE_COLLECTION_STATUS } from "../model/collection-management.constants";
import type { UpdateCollectionFailure, UpdateCollectionResult } from "../model/collection-management.types";

import { collectionManagementActionClient } from "./action-client";
import { checkSession } from "./session-check";

// The owner is resolved from the session by the database, never from input (NFR-1). Nothing is counted before
// the limit step, and every attempt counts from there on (FR-10). Only a saved edit refreshes the client
// router (design D10). No retry: every attempt counts against the limit.

const NOT_FOUND: UpdateCollectionResult = { status: UPDATE_COLLECTION_STATUS.notFound };

function failed(failure: UpdateCollectionFailure): UpdateCollectionResult {
  return { status: UPDATE_COLLECTION_STATUS.failed, failure };
}

/** The steps of design D6, in order; each failure stops the rest. */
async function updateCollection(input: UpdateCollectionInput): Promise<UpdateCollectionResult> {
  // 1. A malformed id names no collection: nothing else runs.
  if (!isCollectionId(input.collectionId)) return NOT_FOUND;

  // 2. Field rules. Nothing is counted yet.
  const form = collectionFormSchema.safeParse(input);
  if (!form.success) return { status: UPDATE_COLLECTION_STATUS.invalid, fieldErrors: toCollectionFieldErrors(form.error) };

  // 3. Session.
  const session = await checkSession();
  if (!session.ok) return failed(session.failure);

  // 4. The limit, before any other I/O.
  const allowance = await consumeCollectionEditAllowance();
  if (!allowance.ok) return failed(allowance.failure);

  // 5. The edit page is a 404 for a non-public profile, so only a profile changed in another tab gets here;
  //    the alert names the fix.
  const author = await getOwnPublicAuthor();
  if (!author.ok) return failed(author.failure);
  if (author.status === "not-public") return failed("not-public");

  // 6. The row; another author's collection and a missing one are the same not-found.
  const updated = await updateOwnCollection({
    collectionId: input.collectionId,
    title: form.data.title,
    description: form.data.description,
  });
  if (!updated.ok) return failed(updated.failure);
  if (updated.status === "not-found") return NOT_FOUND;

  // 7. Saved: the client router's copies of the author's pages must show it.
  refresh();
  return { status: UPDATE_COLLECTION_STATUS.saved };
}

/** Saves an edit of one of the caller's own collections (design D6). */
export const updateCollectionAction = collectionManagementActionClient
  .inputSchema(updateCollectionInputSchema)
  .action(async ({ parsedInput }): Promise<UpdateCollectionResult> => updateCollection(parsedInput));

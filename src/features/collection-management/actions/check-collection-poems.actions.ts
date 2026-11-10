"use server";

import { getCollectionPoemChoices } from "../dal/collection-poems";
import { getOwnCollection } from "../dal/own-collections";
import { isCollectionId } from "../model/collection-form.schema";
import { CHECK_COLLECTION_POEMS_STATUS } from "../model/collection-management.constants";
import type { CheckCollectionPoemsResult } from "../model/collection-management.types";
import { type CheckCollectionPoemsInput, checkCollectionPoemsInputSchema } from "../model/collection-poems.schema";

import { collectionManagementActionClient } from "./action-client";
import { checkSession } from "./session-check";

const NOT_FOUND: CheckCollectionPoemsResult = { status: CHECK_COLLECTION_POEMS_STATUS.notFound };
const UNAVAILABLE: CheckCollectionPoemsResult = { status: CHECK_COLLECTION_POEMS_STATUS.failed, failure: "unavailable" };

/** The steps of add-poems-to-collections D4, in order; each failure stops the rest. A read only: nothing is counted. */
async function checkCollectionPoems(input: CheckCollectionPoemsInput): Promise<CheckCollectionPoemsResult> {
  // 1. A malformed id names no collection: nothing else runs.
  if (!isCollectionId(input.collectionId)) return NOT_FOUND;

  // 2. Session.
  const session = await checkSession();
  if (!session.ok) return { status: CHECK_COLLECTION_POEMS_STATUS.failed, failure: session.failure };

  // 3. The collection, with the page's own 404 rules: gone, another author's, or a profile no longer public.
  const collection = await getOwnCollection(input.collectionId);
  if (!collection.ok) return collection.reason === "not-found" ? NOT_FOUND : UNAVAILABLE;

  // 4. Something to manage: a poem in this collection or a free one.
  const choices = await getCollectionPoemChoices(input.collectionId);
  if (!choices.ok) return UNAVAILABLE;
  if (choices.choices.length === 0) return { status: CHECK_COLLECTION_POEMS_STATUS.nothingToManage };

  return { status: CHECK_COLLECTION_POEMS_STATUS.ready };
}

/** Whether the collection still exists and has something to manage (add-poems-to-collections D4). */
export const checkCollectionPoemsAction = collectionManagementActionClient
  .inputSchema(checkCollectionPoemsInputSchema)
  .action(async ({ parsedInput }): Promise<CheckCollectionPoemsResult> => checkCollectionPoems(parsedInput));

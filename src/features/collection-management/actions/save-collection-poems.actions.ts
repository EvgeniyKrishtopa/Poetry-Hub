"use server";

import { refresh } from "next/cache";

import { getOwnPublicAuthor } from "@/features/authors";

import { consumeCollectionPoemsSaveAllowance } from "../dal/collection-poems-allowance";
import { saveOwnCollectionPoems } from "../dal/collection-poems-writes";
import { isCollectionId } from "../model/collection-form.schema";
import { SAVE_COLLECTION_POEMS_STATUS } from "../model/collection-management.constants";
import type { SaveCollectionPoemsFailure, SaveCollectionPoemsResult } from "../model/collection-management.types";
import {
  collectionPoemsChangeSchema,
  type SaveCollectionPoemsInput,
  saveCollectionPoemsInputSchema,
} from "../model/collection-poems.schema";

import { collectionManagementActionClient } from "./action-client";
import { checkSession } from "./session-check";

// The owner is resolved from the session by the database, never from input (NFR-1). Nothing is counted before
// the limit step, and every attempt counts from there on (FR-7). `saved` and `stale` refresh the client router,
// so the page shows the poems as they are now (D9). No retry: every attempt counts against the limit.

const NOT_FOUND: SaveCollectionPoemsResult = { status: SAVE_COLLECTION_POEMS_STATUS.notFound };

function failed(failure: SaveCollectionPoemsFailure): SaveCollectionPoemsResult {
  return { status: SAVE_COLLECTION_POEMS_STATUS.failed, failure };
}

/** The steps of add-poems-to-collections D6, in order; each failure stops the rest. */
async function saveCollectionPoems(input: SaveCollectionPoemsInput): Promise<SaveCollectionPoemsResult> {
  // 1. A malformed id names no collection; any other bad input is one the form can't produce. Nothing counted.
  if (!isCollectionId(input.collectionId)) return NOT_FOUND;
  const change = collectionPoemsChangeSchema.safeParse(input);
  if (!change.success) return failed("unknown");

  // 2. Session.
  const session = await checkSession();
  if (!session.ok) return failed(session.failure);

  // 3. The limit, before any other I/O.
  const allowance = await consumeCollectionPoemsSaveAllowance();
  if (!allowance.ok) return failed(allowance.failure);

  // 4. The page is a 404 for a non-public profile, so only a profile changed in another tab gets here.
  const author = await getOwnPublicAuthor();
  if (!author.ok) return failed(author.failure);
  if (author.status === "not-public") return failed("not-public");

  // 5. The whole change or nothing; another author's collection and a missing one are the same not-found.
  const saved = await saveOwnCollectionPoems({ collectionId: input.collectionId, ...change.data });
  if (!saved.ok) return failed(saved.failure);
  if (saved.status === "not-found") return NOT_FOUND;

  refresh();
  return { status: saved.status === "saved" ? SAVE_COLLECTION_POEMS_STATUS.saved : SAVE_COLLECTION_POEMS_STATUS.stale };
}

/** Saves the collection's poems: added and removed at once, or nothing (add-poems-to-collections D6). */
export const saveCollectionPoemsAction = collectionManagementActionClient
  .inputSchema(saveCollectionPoemsInputSchema)
  .action(async ({ parsedInput }): Promise<SaveCollectionPoemsResult> => saveCollectionPoems(parsedInput));

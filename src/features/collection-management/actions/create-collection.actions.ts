"use server";

import { refresh } from "next/cache";

import { createOwnCollection } from "../dal/collection-writes";
import {
  collectionFormSchema,
  type CreateCollectionInput,
  createCollectionInputSchema,
  toCollectionFieldErrors,
} from "../model/collection-form.schema";
import { CREATE_COLLECTION_STATUS } from "../model/collection-management.constants";
import type { CreateCollectionFailure, CreateCollectionResult } from "../model/collection-management.types";

import { collectionManagementActionClient } from "./action-client";
import { checkSession } from "./session-check";

// The author is resolved from the session by the database, never from input (NFR-1). Only a created collection
// refreshes the client router (design D10).

function failed(failure: CreateCollectionFailure): CreateCollectionResult {
  return { status: CREATE_COLLECTION_STATUS.failed, failure };
}

/** The steps of design D5, in order; each failure stops the rest. */
async function createCollection(input: CreateCollectionInput): Promise<CreateCollectionResult> {
  // 1. Field rules: the same schema the form runs in the browser.
  const form = collectionFormSchema.safeParse(input);
  if (!form.success) return { status: CREATE_COLLECTION_STATUS.invalid, fieldErrors: toCollectionFieldErrors(form.error) };

  // 2. Session.
  const session = await checkSession();
  if (!session.ok) return failed(session.failure);

  // 3. The insert; the database checks the public profile and the limit under a per-author lock.
  const created = await createOwnCollection(form.data.title, form.data.description);
  if (!created.ok) return failed(created.failure);
  if (created.status === "not-public") return failed("not-public");
  if (created.status === "over-limit") return failed("too-many-collections");

  // 4. Stored: the client router's copies of the author's pages must show it.
  refresh();
  return { status: CREATE_COLLECTION_STATUS.created, title: form.data.title };
}

/** Creates a collection for the caller's own public profile (design D5). */
export const createCollectionAction = collectionManagementActionClient
  .inputSchema(createCollectionInputSchema)
  .action(async ({ parsedInput }): Promise<CreateCollectionResult> => createCollection(parsedInput));

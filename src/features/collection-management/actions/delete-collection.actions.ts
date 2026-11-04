"use server";

import { deleteCollectionInputSchema } from "../model/collection-form.schema";
import type { DeleteCollectionResult } from "../model/collection-management.types";

import { collectionManagementActionClient } from "./action-client";

/** Deletes one of the caller's own collections (design D7). */
export const deleteCollectionAction = collectionManagementActionClient
  .inputSchema(deleteCollectionInputSchema)
  .action(async (): Promise<DeleteCollectionResult> => {
    throw new Error("not implemented");
  });

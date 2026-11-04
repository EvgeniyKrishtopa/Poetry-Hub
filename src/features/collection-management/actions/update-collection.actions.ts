"use server";

import { updateCollectionInputSchema } from "../model/collection-form.schema";
import type { UpdateCollectionResult } from "../model/collection-management.types";

import { collectionManagementActionClient } from "./action-client";

/** Saves an edit of one of the caller's own collections (design D6). */
export const updateCollectionAction = collectionManagementActionClient
  .inputSchema(updateCollectionInputSchema)
  .action(async (): Promise<UpdateCollectionResult> => {
    throw new Error("not implemented");
  });

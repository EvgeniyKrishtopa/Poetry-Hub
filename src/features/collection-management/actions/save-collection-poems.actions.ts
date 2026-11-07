"use server";

import type { SaveCollectionPoemsResult } from "../model/collection-management.types";
import { saveCollectionPoemsInputSchema } from "../model/collection-poems.schema";

import { collectionManagementActionClient } from "./action-client";

/** Saves the collection's poems: added and removed at once, or nothing (add-poems-to-collections D6). */
export const saveCollectionPoemsAction = collectionManagementActionClient
  .inputSchema(saveCollectionPoemsInputSchema)
  .action(async (): Promise<SaveCollectionPoemsResult> => {
    throw new Error("not implemented");
  });

"use server";

import type { CheckCollectionPoemsResult } from "../model/collection-management.types";
import { checkCollectionPoemsInputSchema } from "../model/collection-poems.schema";

import { collectionManagementActionClient } from "./action-client";

/** Whether the collection still exists and has something to manage; a read, counts nothing (add-poems-to-collections D4). */
export const checkCollectionPoemsAction = collectionManagementActionClient
  .inputSchema(checkCollectionPoemsInputSchema)
  .action(async (): Promise<CheckCollectionPoemsResult> => {
    throw new Error("not implemented");
  });

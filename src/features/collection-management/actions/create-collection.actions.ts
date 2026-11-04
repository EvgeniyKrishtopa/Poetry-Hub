"use server";

import { createCollectionInputSchema } from "../model/collection-form.schema";
import type { CreateCollectionResult } from "../model/collection-management.types";

import { collectionManagementActionClient } from "./action-client";

/** Creates a collection for the caller's own public profile (design D5). */
export const createCollectionAction = collectionManagementActionClient
  .inputSchema(createCollectionInputSchema)
  .action(async (): Promise<CreateCollectionResult> => {
    throw new Error("not implemented");
  });

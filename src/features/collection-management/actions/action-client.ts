import "server-only";

import { createActionClient } from "@/shared/lib/safe-action/create-action-client";

import { CREATE_COLLECTION_FAILURE_MESSAGES } from "../model/collection-management-messages";

/** The shared log-and-mask policy: the input carries the author's collection. */
export const collectionManagementActionClient = createActionClient({
  logPrefix: "collection-management",
  genericMessage: CREATE_COLLECTION_FAILURE_MESSAGES.unknown,
});

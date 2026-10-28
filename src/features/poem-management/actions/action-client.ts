import "server-only";

import { createActionClient } from "@/shared/lib/safe-action/create-action-client";

import { CREATE_POEM_FAILURE_MESSAGES } from "../model/poem-management-messages";

/** The shared log-and-mask policy: the input carries the author's poem. */
export const poemManagementActionClient = createActionClient({
  logPrefix: "poem-management",
  genericMessage: CREATE_POEM_FAILURE_MESSAGES.unknown,
});

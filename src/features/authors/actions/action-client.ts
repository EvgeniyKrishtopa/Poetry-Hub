import "server-only";

import { createActionClient } from "@/shared/lib/safe-action/create-action-client";

import { getProfileFailureMessage } from "../model/author-messages";

/** The client every authors Server Action is built with: the shared log-and-mask policy (design D1). */
export const authorsActionClient = createActionClient({
  logPrefix: "authors",
  genericMessage: getProfileFailureMessage("unknown"),
});

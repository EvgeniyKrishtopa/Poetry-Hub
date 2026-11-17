import "server-only";

import { createActionClient } from "@/shared/lib/safe-action/create-action-client";

import { MODERATION_FAILURE_MESSAGES } from "../model/admin-messages";

/** The shared log-and-mask policy for every admin action. */
export const adminActionClient = createActionClient({
  logPrefix: "admin",
  genericMessage: MODERATION_FAILURE_MESSAGES.unavailable,
});

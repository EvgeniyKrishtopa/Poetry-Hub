import "server-only";

import { createActionClient } from "@/shared/lib/safe-action/create-action-client";

import { MOVE_FAILURE_MESSAGES } from "../model/work-ordering-messages";

/** The shared log-and-mask policy for both move actions. */
export const workOrderingActionClient = createActionClient({
  logPrefix: "work-ordering",
  genericMessage: MOVE_FAILURE_MESSAGES.failed,
});

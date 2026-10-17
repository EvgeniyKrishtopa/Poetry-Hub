import "server-only";

import { createActionClient } from "@/shared/lib/safe-action/create-action-client";

import { GENERIC_SERVER_ERROR } from "../model/auth-messages";

/**
 * The client every auth Server Action is built with (design D2): the shared log-and-mask policy,
 * because an error's message or the action input could carry the password.
 */
export const authActionClient = createActionClient({
  logPrefix: "auth",
  genericMessage: GENERIC_SERVER_ERROR,
});

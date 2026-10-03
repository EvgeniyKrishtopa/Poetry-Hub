import "server-only";

import { createSafeActionClient } from "next-safe-action";

import { GENERIC_SERVER_ERROR } from "../model/auth-messages";

/**
 * The client every auth Server Action is built with (design D2). An unexpected throw becomes
 * the generic `serverError`; only the error's `name` is logged, because its message or the
 * action input could carry the password (NFR-1).
 */
// implements FR-8 of add-supabase-auth
// implements NFR-1 of add-supabase-auth
export const authActionClient = createSafeActionClient({
  handleServerError(error) {
    console.error(`[auth] action failed: ${error.name}`);
    return GENERIC_SERVER_ERROR;
  },
  defaultValidationErrorsShape: "flattened",
});

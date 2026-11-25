import "server-only";

import { classifySupabaseError } from "@/shared/lib/supabase/classify-error";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import type { RestrictionCheck } from "../model/auth.types";
import { restrictionAnswerSchema } from "../model/restriction-answer.schema";

import { logFailure, withStatus } from "./failure-log";

const CHECK_OPERATION = "check restriction";

/**
 * Asks the caller's own `is_restricted()` through the cookie client, so it answers only for the session's user and
 * reveals nothing about any address. `restricted` and `unauthenticated` (a token that expired since the session
 * read) send `/reset-password` to the signed-out redirect; any other failure is `unknown` and fails closed. Stays in
 * `dal/`, never `actions/`. Never throws (password-recovery design D4, D8).
 */
export async function checkRestriction(): Promise<RestrictionCheck> {
  try {
    const supabase = await createSupabaseServerClient();
    const response = await supabase.rpc("is_restricted");
    if (response.error) {
      const error = withStatus(response.error, response.status);
      logFailure(CHECK_OPERATION, error);
      return classifySupabaseError(error) === "unauthenticated" ? "unauthenticated" : "unknown";
    }

    const answer = restrictionAnswerSchema.safeParse(response.data);
    if (!answer.success) {
      logFailure(CHECK_OPERATION, answer.error);
      return "unknown";
    }
    return answer.data ? "restricted" : "allowed";
  } catch (error) {
    // A config error, or an unexpected throw: still a value, never an exception.
    logFailure(CHECK_OPERATION, error);
    return "unknown";
  }
}

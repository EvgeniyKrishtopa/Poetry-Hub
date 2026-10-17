import "server-only";

import { z } from "zod";

import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { WRITE_SCOPES } from "../model/author.constants";
import type { WriteAllowance, WriteFailure, WriteScope } from "../model/author.types";

import { toProfileFailure, withStatus } from "./profile-failure";

const OPERATION = "check write limit";

const OVER_LIMIT_FAILURES: Readonly<Record<WriteScope, WriteFailure>> = {
  [WRITE_SCOPES.profileWrite]: "too-many-saves",
  [WRITE_SCOPES.photoUpload]: "too-many-uploads",
};

/** Anything but a boolean fails the parse, so a changed return shape keeps the check closed. */
const allowedSchema = z.boolean();

/**
 * Counts one attempt against the caller's limit for `scope` (FR-21, design D13). The cookie client runs
 * as the session's user, so the database resolves the caller; the limits live in the function, and only
 * the scope is sent. Never throws for an expected failure.
 */
export async function consumeWriteAllowance(scope: WriteScope): Promise<WriteAllowance> {
  try {
    const supabase = await createSupabaseServerClient();
    const response = await supabase.rpc("consume_write_allowance", { scope });
    if (response.error) {
      return { ok: false, failure: toProfileFailure(OPERATION, withStatus(response.error, response.status)) };
    }

    const allowed = allowedSchema.safeParse(response.data);
    if (!allowed.success) return { ok: false, failure: toProfileFailure(OPERATION, allowed.error) };
    return allowed.data ? { ok: true } : { ok: false, failure: OVER_LIMIT_FAILURES[scope] };
  } catch (error) {
    // A config error, or an unexpected throw: still a value, never an exception.
    return { ok: false, failure: toProfileFailure(OPERATION, error) };
  }
}

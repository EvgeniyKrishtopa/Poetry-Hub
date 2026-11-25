import "server-only";

import { z } from "zod";

import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import type { PasswordResetAllowance } from "../model/auth.types";

import { logFailure, withStatus } from "./failure-log";

/** The scope in `write_rate_limits` (password-recovery design D6). */
const PASSWORD_RESET_SCOPE = "password_reset";

const CHECK_OPERATION = "check password reset limit";

/** Anything but a boolean fails the parse, so a changed return shape keeps the check closed. */
const allowedSchema = z.boolean();

/**
 * Counts one attempt against the `password_reset` scope of `consume_write_allowance` (ADR 0007). The feature's own
 * copy of the one-scope helper; anything but a boolean answer is `failed`, which never allows an update, and a
 * refusal is a value, not a throw (password-recovery design D5, D6). Never throws.
 */
export async function consumePasswordResetAllowance(): Promise<PasswordResetAllowance> {
  try {
    const supabase = await createSupabaseServerClient();
    const response = await supabase.rpc("consume_write_allowance", { scope: PASSWORD_RESET_SCOPE });
    if (response.error) {
      logFailure(CHECK_OPERATION, withStatus(response.error, response.status));
      return "failed";
    }

    const allowed = allowedSchema.safeParse(response.data);
    if (!allowed.success) {
      logFailure(CHECK_OPERATION, allowed.error);
      return "failed";
    }
    if (allowed.data) return "allowed";

    // Expected, not an error, but worth seeing if one account keeps hitting it.
    console.warn("[auth] password reset limit reached");
    return "refused";
  } catch (error) {
    // A config error, or an unexpected throw: still a value, never an exception.
    logFailure(CHECK_OPERATION, error);
    return "failed";
  }
}

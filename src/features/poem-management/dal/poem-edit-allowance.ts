import "server-only";

import { z } from "zod";

import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import type { PoemEditAllowance } from "../model/poem-management.types";

import { toServiceFailure, withStatus } from "./write-log";

const OPERATION = "check edit limit";

/** The limit's scope in `write_rate_limits` (edit-poem design D2). */
const POEM_EDIT_SCOPE = "poem_edit";

/** Anything but a boolean fails the parse, so a changed return shape keeps the check closed. */
const allowedSchema = z.boolean();

/**
 * Counts one save attempt against the caller's `poem_edit` limit; never throws (edit-poem design D3). The
 * cookie client runs as the session's user, so the database resolves the caller; the limit lives in the
 * function, and only the scope is sent.
 */
export async function consumePoemEditAllowance(): Promise<PoemEditAllowance> {
  try {
    const supabase = await createSupabaseServerClient();
    const response = await supabase.rpc("consume_write_allowance", { scope: POEM_EDIT_SCOPE });
    if (response.error) {
      return { ok: false, failure: toServiceFailure(OPERATION, withStatus(response.error, response.status)) };
    }

    const allowed = allowedSchema.safeParse(response.data);
    if (!allowed.success) return { ok: false, failure: toServiceFailure(OPERATION, allowed.error) };
    if (allowed.data) return { ok: true };

    // Expected, not an error, but worth seeing if one account keeps hitting it.
    console.warn("[poem-management] edit limit reached");
    return { ok: false, failure: "too-many-saves" };
  } catch (error) {
    // A config error, or an unexpected throw: still a value, never an exception.
    return { ok: false, failure: toServiceFailure(OPERATION, error) };
  }
}

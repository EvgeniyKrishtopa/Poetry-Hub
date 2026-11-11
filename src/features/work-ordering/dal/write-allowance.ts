import "server-only";

import { z } from "zod";

import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import type { WriteAllowance } from "../model/work-ordering.types";

import { toServiceFailure, withStatus } from "./write-log";

/** One write limit: its scope in `write_rate_limits` and what the log calls it. */
export interface WriteLimit {
  readonly scope: string;
  /** The log's operation for a failed check, e.g. `check move limit`. */
  readonly operation: string;
  /** The log's name for the limit when it is reached, e.g. `move limit`. */
  readonly name: string;
}

/** Anything but a boolean fails the parse, so a changed return shape keeps the check closed. */
const allowedSchema = z.boolean();

/**
 * Counts one attempt against the caller's limit for `limit.scope`; never throws. The cookie client runs as the
 * session's user, so the database resolves the caller; the limit lives in `consume_write_allowance`, and only
 * the scope is sent (ADR 0007). The feature's own copy of its siblings' helper.
 */
export async function consumeWriteAllowance(limit: WriteLimit): Promise<WriteAllowance> {
  try {
    const supabase = await createSupabaseServerClient();
    const response = await supabase.rpc("consume_write_allowance", { scope: limit.scope });
    if (response.error) {
      return { ok: false, failure: toServiceFailure(limit.operation, withStatus(response.error, response.status)) };
    }

    const allowed = allowedSchema.safeParse(response.data);
    if (!allowed.success) return { ok: false, failure: toServiceFailure(limit.operation, allowed.error) };
    if (allowed.data) return { ok: true };

    // Expected, not an error, but worth seeing if one account keeps hitting it.
    console.warn(`[work-ordering] ${limit.name} reached`);
    return { ok: false, failure: "too-many-moves" };
  } catch (error) {
    // A config error, or an unexpected throw: still a value, never an exception.
    return { ok: false, failure: toServiceFailure(limit.operation, error) };
  }
}

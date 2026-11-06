import "server-only";

import { z } from "zod";

import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import type { CollectionEditAllowance } from "../model/collection-management.types";

import { toServiceFailure, withStatus } from "./write-log";

const OPERATION = "check edit limit";

/** The limit's scope in `write_rate_limits` (design D2). */
const COLLECTION_EDIT_SCOPE = "collection_edit";

/** Anything but a boolean fails the parse, so a changed return shape keeps the check closed. */
const allowedSchema = z.boolean();

/**
 * Counts one save attempt against the caller's `collection_edit` limit, 10 per minute per account; never throws
 * (design D2, D6). The cookie client runs as the session's user, so the database resolves the caller; the limit
 * lives in the function, and only the scope is sent.
 */
export async function consumeCollectionEditAllowance(): Promise<CollectionEditAllowance> {
  try {
    const supabase = await createSupabaseServerClient();
    const response = await supabase.rpc("consume_write_allowance", { scope: COLLECTION_EDIT_SCOPE });
    if (response.error) {
      return { ok: false, failure: toServiceFailure(OPERATION, withStatus(response.error, response.status)) };
    }

    const allowed = allowedSchema.safeParse(response.data);
    if (!allowed.success) return { ok: false, failure: toServiceFailure(OPERATION, allowed.error) };
    if (allowed.data) return { ok: true };

    // Expected, not an error, but worth seeing if one account keeps hitting it.
    console.warn("[collection-management] edit limit reached");
    return { ok: false, failure: "too-many-saves" };
  } catch (error) {
    // A config error, or an unexpected throw: still a value, never an exception.
    return { ok: false, failure: toServiceFailure(OPERATION, error) };
  }
}

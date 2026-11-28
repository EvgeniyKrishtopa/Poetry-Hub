import "server-only";

import { z } from "zod";

import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import type { TotpVerifyAllowance } from "../model/totp.types";

import { logFailure, withStatus } from "./rpc-failure";

/** The scope in `write_rate_limits` (design D6). */
const TOTP_VERIFY_SCOPE = "totp_verify";

const CHECK_OPERATION = "check second factor limit";

/** Anything but a boolean fails the parse, so a changed return shape keeps the check closed. */
const allowedSchema = z.boolean();

/** Counts one code attempt against the `totp_verify` scope; anything but `allowed` stops the check. Never throws. */
export async function consumeTotpVerifyAllowance(): Promise<TotpVerifyAllowance> {
  try {
    const supabase = await createSupabaseServerClient();
    const response = await supabase.rpc("consume_write_allowance", { scope: TOTP_VERIFY_SCOPE });
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

    console.warn("[admin] second factor limit reached");
    return "refused";
  } catch (error) {
    logFailure(CHECK_OPERATION, error);
    return "failed";
  }
}

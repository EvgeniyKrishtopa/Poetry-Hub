"use server";

import { redirect } from "next/navigation";

import { ADMIN_PATH } from "@/shared/config/account-paths";

import { verifyTotpCode } from "../dal/totp";
import { consumeTotpVerifyAllowance } from "../dal/totp-verify-allowance";
import { totpCodeSchema } from "../model/totp.schema";
import type { TotpCodeActionResult } from "../model/totp.types";

import { adminActionClient } from "./action-client";
import { checkSecondFactorStep } from "./check-second-factor-step";

/** Checks one code and, when it is right, redirects to `/admin` with an `aal2` session. */
export const verifyTotpCodeAction = adminActionClient
  .inputSchema(totpCodeSchema)
  .action(async ({ parsedInput }): Promise<TotpCodeActionResult> => {
    const step = await checkSecondFactorStep();
    if (!step.ok) return { ok: false, failure: "unavailable" };

    // Counted before Supabase is asked, and failing closed: a check that could not tell lets no code through.
    const allowance = await consumeTotpVerifyAllowance();
    if (allowance === "refused") return { ok: false, failure: "limited" };
    if (allowance === "failed") return { ok: false, failure: "unavailable" };

    const verified = await verifyTotpCode(parsedInput.factorId, parsedInput.code);
    if (!verified.ok) return { ok: false, failure: verified.failure };
    // Outside every try: `redirect` throws NEXT_REDIRECT, which a catch would swallow.
    redirect(ADMIN_PATH);
  });

import "server-only";

import { cache } from "react";

import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import type { TotpEnrolmentResult, TotpFactorResult, TotpVerifyResult } from "../model/totp.types";

import { logFailure } from "./rpc-failure";

// Everything runs as the signed-in caller through the cookie client. A failure is a value and a log line with the
// operation and the error's kind only: never the secret, the QR code, the code or a factor id (NFR-2).

const FACTOR_TYPE = "totp";
/** Supabase Auth's `error_code` for a code that does not match. */
const WRONG_CODE_ERROR = "mfa_verification_failed";

const READ_OPERATION = "read second factor";
const ENROL_OPERATION = "enrol second factor";
const VERIFY_OPERATION = "verify second factor";

const UNAVAILABLE = { ok: false, failure: "unavailable" } as const;

/** Whether the signed-in admin has a verified factor. Cached, so the page and its trail share one answer (ADR 0011). */
export const readTotpFactor = cache(async (): Promise<TotpFactorResult> => {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      logFailure(READ_OPERATION, error);
      return UNAVAILABLE;
    }

    // `totp` lists verified factors only.
    const [factor] = data.totp;
    if (factor === undefined) return { ok: true, status: "not-enrolled" };
    return { ok: true, status: "enrolled", factorId: factor.id };
  } catch (error) {
    logFailure(READ_OPERATION, error);
    return UNAVAILABLE;
  }
});

/** Removes an unfinished factor, then enrolls a new one. The QR code and secret are never logged. */
export async function startTotpEnrolment(): Promise<TotpEnrolmentResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const listed = await supabase.auth.mfa.listFactors();
    if (listed.error) {
      logFailure(ENROL_OPERATION, listed.error);
      return UNAVAILABLE;
    }

    const unfinished = listed.data.all.filter(
      (factor) => factor.factor_type === FACTOR_TYPE && factor.status === "unverified",
    );
    for (const factor of unfinished) {
      const removed = await supabase.auth.mfa.unenroll({ factorId: factor.id });
      if (removed.error) {
        logFailure(ENROL_OPERATION, removed.error);
        return UNAVAILABLE;
      }
    }

    const { data, error } = await supabase.auth.mfa.enroll({ factorType: FACTOR_TYPE });
    if (error) {
      logFailure(ENROL_OPERATION, error);
      return UNAVAILABLE;
    }
    // Auth's SVG ends with a newline, and `next/image` throws on such a `src`, which would take the page down.
    const qrCode = data.totp.qr_code.trim();
    return { ok: true, factorId: data.id, qrCode, secret: data.totp.secret };
  } catch (error) {
    logFailure(ENROL_OPERATION, error);
    return UNAVAILABLE;
  }
}

/** Challenges and verifies one code; success raises the session to `aal2` and writes its cookies. */
export async function verifyTotpCode(factorId: string, code: string): Promise<TotpVerifyResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    if (!error) return { ok: true };
    // A mistyped code is the expected failure, not worth a log line here.
    if (error.code === WRONG_CODE_ERROR) return { ok: false, failure: "wrong-code" };

    logFailure(VERIFY_OPERATION, error);
    return UNAVAILABLE;
  } catch (error) {
    logFailure(VERIFY_OPERATION, error);
    return UNAVAILABLE;
  }
}

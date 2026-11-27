import "server-only";

import { cache } from "react";

import type { TotpEnrolmentResult, TotpFactorResult, TotpVerifyResult } from "../model/totp.types";

/** Whether the signed-in admin has a verified factor. Cached, so the page and its trail share one answer (ADR 0011). */
export const readTotpFactor = cache(async (): Promise<TotpFactorResult> => {
  throw new Error("not implemented");
});

/** Removes an unfinished factor, then enrolls a new one. The QR code and secret are never logged. */
export async function startTotpEnrolment(): Promise<TotpEnrolmentResult> {
  throw new Error("not implemented");
}

/** Challenges and verifies one code; success raises the session to `aal2`. */
export async function verifyTotpCode(factorId: string, code: string): Promise<TotpVerifyResult> {
  void factorId;
  void code;
  throw new Error("not implemented");
}

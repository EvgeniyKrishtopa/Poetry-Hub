"use server";

import { startTotpEnrolment } from "../dal/totp";
import type { TotpEnrolmentResult } from "../model/totp.types";

import { adminActionClient } from "./action-client";
import { checkSecondFactorStep } from "./check-second-factor-step";

/** Starts the enrolment of a second factor; never runs on a render. */
export const startTotpEnrolmentAction = adminActionClient.action(async (): Promise<TotpEnrolmentResult> => {
  const step = await checkSecondFactorStep();
  if (!step.ok) return { ok: false, failure: "unavailable" };

  return startTotpEnrolment();
});

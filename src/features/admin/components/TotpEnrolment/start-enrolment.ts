import { startTotpEnrolmentAction } from "../../actions/start-totp-enrolment.actions";
import type { TotpEnrolmentResult } from "../../model/totp.types";

const UNAVAILABLE: TotpEnrolmentResult = { ok: false, failure: "unavailable" };

/** Like `submitTotpCode`: a redirect is rethrown so it reaches Next, a dropped connection is `unavailable`. */
export async function startEnrolment(): Promise<TotpEnrolmentResult> {
  try {
    const result = await startTotpEnrolmentAction();
    return result.data ?? UNAVAILABLE;
  } catch (error) {
    if (error instanceof TypeError) return UNAVAILABLE;
    throw error;
  }
}

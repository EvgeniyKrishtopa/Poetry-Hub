import { verifyTotpCodeAction } from "../../actions/verify-totp-code.actions";
import type { TotpCodeInput } from "../../model/totp.schema";

import type { TotpCodeFormState } from "./TotpCodeForm.types";

const UNAVAILABLE: TotpCodeFormState = { status: "failed", failure: "unavailable" };

/**
 * Sends one code. Success never returns: the action redirects. A code the schema refuses is a wrong code. A dropped
 * connection is a `TypeError` from `fetch`; every other error, a redirect's included, is rethrown so it reaches Next.
 */
export async function submitTotpCode(input: TotpCodeInput): Promise<TotpCodeFormState> {
  try {
    const result = await verifyTotpCodeAction(input);
    if (result.validationErrors) return { status: "failed", failure: "wrong-code" };
    if (!result.data) return UNAVAILABLE;
    return { status: "failed", failure: result.data.failure };
  } catch (error) {
    if (error instanceof TypeError) return UNAVAILABLE;
    throw error;
  }
}

import type { ProfileActionResponse } from "../../model/author.types";

const REJECTED_CALL: ProfileActionResponse = { data: { status: "failed", failure: "unknown" } };

/**
 * Awaits an action call, mapping a rejected call (a body over the size limit, a network failure)
 * to the `unknown` failure, so it shows under the field and never reaches `error.tsx` (design D10).
 */
export async function settleProfileAction(call: () => Promise<ProfileActionResponse>): Promise<ProfileActionResponse> {
  try {
    return await call();
  } catch {
    return REJECTED_CALL;
  }
}

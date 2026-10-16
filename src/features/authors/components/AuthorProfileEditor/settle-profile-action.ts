import { ACTION_STATUS } from "../../model/author.constants";
import type { ProfileActionResponse } from "../../model/author.types";

const REJECTED_CALL: ProfileActionResponse = { data: { status: ACTION_STATUS.failed, failure: "unknown" } };

/**
 * Awaits an action call, mapping a rejected call (a body over the size limit, a network failure)
 * to the `unknown` failure, so it shows under the field and never reaches `error.tsx` (design D10).
 */
export async function settleProfileAction(call: () => Promise<ProfileActionResponse>): Promise<ProfileActionResponse> {
  try {
    return await call();
  } catch (error) {
    // The error's type only: its message could echo what was submitted (NFR-3).
    console.error(`[authors] action call rejected: ${error instanceof Error ? error.name : typeof error}`);
    return REJECTED_CALL;
  }
}

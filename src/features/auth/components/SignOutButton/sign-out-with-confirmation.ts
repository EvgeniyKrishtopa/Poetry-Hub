import { askBeforeLeaving } from "@/shared/lib/leave-guard/leave-block.store";
import { LEAVE_ANSWER } from "@/shared/lib/leave-guard/leave-guard.constants";

import { SIGN_OUT_STATUS } from "../../model/auth.constants";
import type { SignOutWithConfirmationResult } from "../../model/auth.types";

/**
 * Asks a page with unsaved edits first, then runs `send` (the button's call to the sign-out Server Action) only
 * when the author chose to leave (edit-poem design D10). Client-only: the unsaved draft exists only in the
 * browser, so this check can't live in the Server Action itself.
 */
export async function signOutWithConfirmation(send: () => void): Promise<SignOutWithConfirmationResult> {
  const answer = await askBeforeLeaving();
  if (answer === LEAVE_ANSWER.leave) {
    send();
    return { status: SIGN_OUT_STATUS.sent };
  }
  return { status: answer === LEAVE_ANSWER.stay ? SIGN_OUT_STATUS.stayed : SIGN_OUT_STATUS.dismissed };
}

import { RESET_PASSWORD_PATH, SIGN_IN_PATH } from "@/shared/config/account-paths";
import { HOME_PATH } from "@/shared/config/constants";

import { CONFIRM_FAILED_ERROR, RECOVERY_FAILED_ERROR } from "./auth.constants";
import type { ConfirmOutcome } from "./auth.types";

/** The `type` values of a confirmation link: the sign-up letter's and the recovery letter's. */
export const CONFIRM_TYPE = { signUp: "email", recovery: "recovery" } as const;

const CONFIRM_FAILED_TARGET = `${SIGN_IN_PATH}?error=${CONFIRM_FAILED_ERROR}`;
const RECOVERY_FAILED_TARGET = `${SIGN_IN_PATH}?error=${RECOVERY_FAILED_ERROR}`;

/**
 * Where `/auth/confirm` sends the browser: always one of a few fixed paths, never a request parameter.
 * Takes the link's raw `type` and parses it itself, so the route needs nothing else; an unknown type reads as a
 * failed sign-up link (password-recovery design D1, auth FR-5).
 */
export function getConfirmTarget(type: string | null, outcome: ConfirmOutcome): string {
  if (type === CONFIRM_TYPE.recovery) {
    return outcome === "verified" ? RESET_PASSWORD_PATH : RECOVERY_FAILED_TARGET;
  }
  if (type === CONFIRM_TYPE.signUp && outcome === "verified") return HOME_PATH;
  return CONFIRM_FAILED_TARGET;
}

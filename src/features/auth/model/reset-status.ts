import { RESET_STATUS } from "./auth.constants";
import type { ResetStatus } from "./auth.types";

/** The `status` search parameter as a done-notice kind, or `undefined` for anything else (design D4). */
export function parseResetStatus(value: string | string[] | undefined): ResetStatus | undefined {
  return Object.values(RESET_STATUS).find((status) => status === value);
}

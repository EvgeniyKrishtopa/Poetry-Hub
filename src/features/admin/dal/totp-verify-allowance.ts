import "server-only";

import type { TotpVerifyAllowance } from "../model/totp.types";

/** Counts one code attempt against the `totp_verify` scope; anything but `allowed` stops the check. */
export async function consumeTotpVerifyAllowance(): Promise<TotpVerifyAllowance> {
  throw new Error("not implemented");
}

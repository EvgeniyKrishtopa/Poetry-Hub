import type { ReactNode } from "react";

import type { TotpCodeFailure } from "../../model/totp.types";

export interface TotpCodeFormProps {
  /** The factor to verify against; `null` while the enrolment is still loading, which disables the form. */
  readonly factorId: string | null;
  /** What stands above the form. It is hidden with the form when the service is unavailable. */
  readonly children: ReactNode;
}

export type TotpCodeFormState =
  { readonly status: "idle" } | { readonly status: "failed"; readonly failure: TotpCodeFailure };

import type { RefObject } from "react";

import type { CaseFailureReason } from "../../model/violation.types";

/** Why a block asks first: no warning was sent, or its deadline has not passed (design D6). */
export type EarlyBlockNote =
  { readonly kind: "not-warned" } | { readonly kind: "deadline-open"; readonly deadlineIso: string };

export interface EarlyBlockDialogProps {
  readonly dialogRef: RefObject<HTMLDialogElement | null>;
  readonly email: string;
  readonly note: EarlyBlockNote;
  readonly isPending: boolean;
  readonly failure: CaseFailureReason | null;
  readonly onConfirm: () => void;
  readonly onClose: () => void;
}

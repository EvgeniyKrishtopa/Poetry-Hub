import type { RefObject } from "react";

import type { CaseFailureReason, ViolationContent, ViolationGround } from "../../model/violation.types";

export interface GroundChoiceDialogProps {
  readonly dialogRef: RefObject<HTMLDialogElement | null>;
  readonly isPending: boolean;
  readonly failure: CaseFailureReason | null;
  /** The poem or collection noted as the reason, when the control sits on one. */
  readonly content: ViolationContent | null;
  readonly onConfirm: (ground: ViolationGround) => void;
  readonly onClose: () => void;
}

import type { RefObject } from "react";

import type { ConnectionStatus } from "@/shared/lib/network/use-connection-status";

import type { CaseFailureReason, ViolationContent, ViolationGround } from "../../model/violation.types";

export interface GroundChoiceDialogProps {
  readonly dialogRef: RefObject<HTMLDialogElement | null>;
  /** Who is being added, as the description names them: the address on `/admin`, the author's name on a page. */
  readonly subject: string;
  readonly isPending: boolean;
  readonly connectionStatus: ConnectionStatus;
  readonly failure: CaseFailureReason | null;
  /** The poem or collection noted as the reason, when the control sits on one. */
  readonly content: ViolationContent | null;
  readonly onConfirm: (ground: ViolationGround) => void;
  readonly onClose: () => void;
}

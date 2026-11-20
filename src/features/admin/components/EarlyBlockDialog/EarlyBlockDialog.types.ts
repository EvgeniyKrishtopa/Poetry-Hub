import type { RefObject } from "react";

import type { ModerationFailureReason } from "../../model/admin.types";
import type { EarlyBlockNote } from "../../model/early-block-note";

export interface EarlyBlockDialogProps {
  readonly dialogRef: RefObject<HTMLDialogElement | null>;
  readonly note: EarlyBlockNote;
  readonly isPending: boolean;
  readonly failure: ModerationFailureReason | null;
  readonly onConfirm: () => void;
  readonly onClose: () => void;
}

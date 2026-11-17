import type { RefObject } from "react";

import type { ModerationFailureReason } from "../../model/admin.types";

export interface BanUserDialogProps {
  readonly dialogRef: RefObject<HTMLDialogElement | null>;
  readonly email: string;
  readonly isPending: boolean;
  readonly failure: ModerationFailureReason | null;
  readonly onConfirm: () => void;
  readonly onClose: () => void;
}

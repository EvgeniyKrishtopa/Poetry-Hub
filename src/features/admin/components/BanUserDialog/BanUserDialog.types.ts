import type { RefObject } from "react";

import type { ModerationFailureReason } from "../../model/admin.types";

export interface BanUserDialogProps {
  readonly dialogRef: RefObject<HTMLDialogElement | null>;
  readonly email: string;
  /** A line under the description when the ban comes before a case's deadline (FR-8); absent on the user list. */
  readonly earlyNote?: string;
  readonly isPending: boolean;
  readonly failure: ModerationFailureReason | null;
  readonly onConfirm: () => void;
  readonly onClose: () => void;
}

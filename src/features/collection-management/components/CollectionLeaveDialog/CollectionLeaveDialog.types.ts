import type { RefObject } from "react";

import type { LeaveDialogReason } from "../../model/collection-management.types";

export interface CollectionLeaveDialogProps {
  /** Opened by the caller through `showModal()`. */
  readonly ref: RefObject<HTMLDialogElement | null>;
  /** The stay button: the caller focuses it as the dialog opens, in either form. */
  readonly stayRef: RefObject<HTMLButtonElement | null>;
  readonly reason: LeaveDialogReason;
  readonly onStay: () => void;
  /** The leave-without-saving button, shown in the sign-out form only. */
  readonly onLeave: () => void;
  /** Runs after every close, whatever closed it. */
  readonly onClose: () => void;
}

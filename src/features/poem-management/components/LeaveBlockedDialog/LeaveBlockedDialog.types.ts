import type { RefObject } from "react";

import type { LEAVE_DIALOG_REASON } from "../../model/poem-management.constants";

export type LeaveDialogReason = (typeof LEAVE_DIALOG_REASON)[keyof typeof LEAVE_DIALOG_REASON];

export interface LeaveBlockedDialogProps {
  /** Opened by the caller through `showModal()`. */
  readonly ref: RefObject<HTMLDialogElement | null>;
  /** The stay button (`LEAVE_DIALOG_COPY.stay`): the caller focuses it as the dialog opens, in either form. */
  readonly stayRef: RefObject<HTMLButtonElement | null>;
  readonly reason: LeaveDialogReason;
  readonly onStay: () => void;
  /** The leave-without-saving button (`LEAVE_DIALOG_COPY.leave`), shown in the sign-out form only. */
  readonly onLeave: () => void;
  /** Runs after every close, whatever closed it. */
  readonly onClose: () => void;
}

import type { RefObject } from "react";

export interface LeaveBlockedDialogProps {
  /** Opened by the caller through `showModal()`. */
  readonly ref: RefObject<HTMLDialogElement | null>;
}

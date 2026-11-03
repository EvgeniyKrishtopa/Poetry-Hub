import type { Ref } from "react";

export interface LeaveBlockedDialogProps {
  /** Opened by the caller through `showModal()`. */
  readonly ref: Ref<HTMLDialogElement>;
}

import type { RefObject } from "react";

export interface WarnDialogProps {
  readonly dialogRef: RefObject<HTMLDialogElement | null>;
  readonly caseId: string;
  /** Filled in and read-only: the admin never types an address. */
  readonly email: string;
  /** Called once the warning was sent or the case turned out to be warned or gone, so the row refreshes. */
  readonly onSettled: () => void;
  readonly onClose: () => void;
}

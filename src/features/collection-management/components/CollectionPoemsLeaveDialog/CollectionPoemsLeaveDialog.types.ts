import type { RefObject } from "react";

import type { CollectionPoemsLeaveReason } from "../../model/collection-management.types";

export interface CollectionPoemsLeaveDialogProps {
  readonly dialogRef: RefObject<HTMLDialogElement | null>;
  readonly saveRef: RefObject<HTMLButtonElement | null>;
  readonly stayRef: RefObject<HTMLButtonElement | null>;
  readonly reason: CollectionPoemsLeaveReason;
  /** A save is sending (started here or on the page): every button disabled, the dialog held open. */
  readonly isSaving: boolean;
  /** Offline or slow: the save button disabled and the connection notice shown. */
  readonly canSave: boolean;
  readonly onSave: () => void;
  readonly onLeave: () => void;
  readonly onStay: () => void;
  readonly onClosed: () => void;
}

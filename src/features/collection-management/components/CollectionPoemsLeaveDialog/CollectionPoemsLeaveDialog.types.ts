import type { RefObject } from "react";

import type { ConnectionStatus } from "@/shared/lib/network/use-connection-status";

import type { CollectionPoemsLeaveReason } from "../../model/collection-management.types";

export interface CollectionPoemsLeaveDialogProps {
  /** Opened by the caller through `showModal()`. */
  readonly dialogRef: RefObject<HTMLDialogElement | null>;
  /** Takes focus on open while online. */
  readonly saveRef: RefObject<HTMLButtonElement | null>;
  /** Takes focus on open while offline or slow. */
  readonly stayRef: RefObject<HTMLButtonElement | null>;
  readonly reason: CollectionPoemsLeaveReason;
  /** A save is sending (started here or on the page): every button disabled, the dialog held open. */
  readonly isSaving: boolean;
  /** Offline or slow: the save button disabled and the connection notice shown. */
  readonly connection: ConnectionStatus;
  readonly onSave: () => void;
  readonly onLeave: () => void;
  readonly onStay: () => void;
  /** Runs after every close, whatever closed it. */
  readonly onClosed: () => void;
}

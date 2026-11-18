"use client";

import { useEffect } from "react";

import { Alert, Button, Dialog } from "@/shared/ui";

import { EARLY_BLOCK_COPY, MODERATION_FAILURE_MESSAGES } from "../../model/admin-messages";
import { earlyBlockNoteText } from "../../model/early-block-note";

import type { EarlyBlockDialogProps } from "./EarlyBlockDialog.types";

/** The block confirmation before a harmful-content case's deadline, in the shape of `BanUserDialog` (FR-8). */
export function EarlyBlockDialog({ dialogRef, note, isPending, failure, onConfirm, onClose }: EarlyBlockDialogProps) {
  // The transition ends after the refresh; a successful block has no failure, so the dialog closes then.
  const finished = !isPending && failure === null;
  useEffect(() => {
    if (finished && dialogRef.current?.open) dialogRef.current.close();
  }, [finished, dialogRef]);

  return (
    <Dialog
      ref={dialogRef}
      title={EARLY_BLOCK_COPY.title}
      description={earlyBlockNoteText(note)}
      closeLabel={EARLY_BLOCK_COPY.close}
      closable={!isPending}
      onClose={onClose}
    >
      {failure !== null && <Alert tone="danger">{MODERATION_FAILURE_MESSAGES[failure]}</Alert>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" disabled={isPending} onClick={() => dialogRef.current?.close()}>
          {EARLY_BLOCK_COPY.cancel}
        </Button>
        <Button variant="danger" disabled={isPending} aria-busy={isPending} onClick={onConfirm}>
          {EARLY_BLOCK_COPY.confirm}
        </Button>
      </div>
    </Dialog>
  );
}

"use client";

import { useEffect } from "react";

import { Alert, Button, Dialog } from "@/shared/ui";

import { BAN_DIALOG_COPY, MODERATION_FAILURE_MESSAGES } from "../../model/admin-messages";

import type { BanUserDialogProps } from "./BanUserDialog.types";

/** The ban confirmation: names the address, holds open while the request runs, shows a failure above the buttons. */
export function BanUserDialog({ dialogRef, email, isPending, failure, onConfirm, onClose }: BanUserDialogProps) {
  // The transition ends after the refresh; a successful ban has no failure, so the dialog closes then.
  const finished = !isPending && failure === null;
  useEffect(() => {
    if (finished && dialogRef.current?.open) dialogRef.current.close();
  }, [finished, dialogRef]);

  return (
    <Dialog
      ref={dialogRef}
      title={BAN_DIALOG_COPY.title}
      description={BAN_DIALOG_COPY.description(email)}
      closeLabel={BAN_DIALOG_COPY.close}
      closable={!isPending}
      onClose={onClose}
    >
      {failure !== null && <Alert tone="danger">{MODERATION_FAILURE_MESSAGES[failure]}</Alert>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="ghost" disabled={isPending} onClick={() => dialogRef.current?.close()}>
          {BAN_DIALOG_COPY.cancel}
        </Button>
        <Button variant="danger" disabled={isPending} aria-busy={isPending} onClick={onConfirm}>
          {BAN_DIALOG_COPY.confirm}
        </Button>
      </div>
    </Dialog>
  );
}

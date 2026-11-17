"use client";

import { useRef } from "react";

import { CONTENT_LANG } from "@/shared/config/constants";
import { Alert, Button, Dialog } from "@/shared/ui";

import { ADMIN_DELETE_COPY, ADMIN_DELETE_FAILURE_MESSAGES } from "../../model/admin-messages";

import type { AdminDeleteButtonProps } from "./AdminDeleteButton.types";
import { useAdminDelete } from "./use-admin-delete";

/** The admin's delete button with its confirmation dialog, for a poem or a collection of another author (FR-10). */
export function AdminDeleteButton({ kind, id, title, redirectHref }: AdminDeleteButtonProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const {
    openConfirmDialog,
    cancelDeletion,
    confirmDeletion,
    handleDialogClosed,
    isDeleting,
    isLeavingPage,
    deleteFailure,
    isAlreadyDeleted,
  } = useAdminDelete(kind, id, redirectHref, dialogRef);
  const copy = ADMIN_DELETE_COPY[kind];

  return (
    <div lang={CONTENT_LANG} className="flex flex-col items-start gap-3">
      {isAlreadyDeleted && <Alert tone="neutral">{copy.alreadyGone}</Alert>}
      <Button variant="danger" aria-haspopup="dialog" onClick={openConfirmDialog}>
        {copy.button}
      </Button>
      <Dialog
        ref={dialogRef}
        title={copy.dialogTitle(title)}
        description={copy.dialogDescription}
        closeLabel={ADMIN_DELETE_COPY.close}
        closable={!isDeleting || isLeavingPage}
        onClose={handleDialogClosed}
      >
        {deleteFailure !== null && <Alert tone="danger">{ADMIN_DELETE_FAILURE_MESSAGES[deleteFailure]}</Alert>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" disabled={isDeleting} onClick={cancelDeletion}>
            {ADMIN_DELETE_COPY.cancel}
          </Button>
          <Button variant="danger" disabled={isDeleting} aria-busy={isDeleting} onClick={confirmDeletion}>
            {ADMIN_DELETE_COPY.confirm}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

"use client";

import type { RefObject } from "react";

import type { AdminDeleteKind } from "../../model/admin.types";

import { useDeleteDialog } from "./use-delete-dialog";
import { useDeleteRequest } from "./use-delete-request";

/**
 * Joins the confirmation dialog and the delete request for one button: opening a dialog starts without the last
 * «already gone» line, and every way the dialog closes clears the failure, so a reopened dialog starts clean.
 */
export function useAdminDelete(
  kind: AdminDeleteKind,
  id: string,
  redirectHref: string,
  dialogRef: RefObject<HTMLDialogElement | null>,
) {
  const dialog = useDeleteDialog(dialogRef);
  const request = useDeleteRequest(kind, id, redirectHref, dialog.closeConfirmDialogBeforeNavigation);

  function openConfirmDialog() {
    request.clearAlreadyDeletedNotice();
    dialog.openConfirmDialog();
  }

  return {
    openConfirmDialog,
    cancelDeletion: dialog.closeConfirmDialog,
    confirmDeletion: request.confirmDeletion,
    handleDialogClosed: request.clearDeleteFailure,
    isDeleting: request.isDeleting,
    isLeavingPage: dialog.isLeavingPage,
    deleteFailure: request.deleteFailure,
    isAlreadyDeleted: request.isAlreadyDeleted,
  };
}

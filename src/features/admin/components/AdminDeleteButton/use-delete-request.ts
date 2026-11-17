"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import type { AdminDeleteKind, DeleteFailureReason } from "../../model/admin.types";

import { callDelete } from "./call-delete";

type ShownFailure = Exclude<DeleteFailureReason, "not-found">;

/**
 * Runs one delete and keeps its outcome: the failure the dialog shows, or the «already gone» line the button shows.
 * A success replaces the page with the redirect, since the page it showed no longer exists; the dialog is closed by
 * the caller-supplied `closeDialogBeforeNavigation`, so this hook does not know about the dialog.
 */
export function useDeleteRequest(
  kind: AdminDeleteKind,
  id: string,
  redirectHref: string,
  closeDialogBeforeNavigation: () => void,
) {
  const router = useRouter();
  const [isDeleting, startDeleting] = useTransition();
  const [deleteFailure, setDeleteFailure] = useState<ShownFailure | null>(null);
  const [isAlreadyDeleted, setIsAlreadyDeleted] = useState(false);
  // Set synchronously: a second click can arrive before the pending state disables the button.
  const isRequestInFlightRef = useRef(false);

  function clearDeleteFailure() {
    setDeleteFailure(null);
  }

  function clearAlreadyDeletedNotice() {
    setIsAlreadyDeleted(false);
  }

  function confirmDeletion() {
    if (isRequestInFlightRef.current) return;
    isRequestInFlightRef.current = true;
    setDeleteFailure(null);
    startDeleting(async () => {
      const result = await callDelete(kind, id);
      isRequestInFlightRef.current = false;
      if (result.ok) {
        closeDialogBeforeNavigation();
        // `replace`, so Back does not return to the deleted page.
        router.replace(redirectHref);
        return;
      }
      if (result.reason === "not-found") {
        closeDialogBeforeNavigation();
        setIsAlreadyDeleted(true);
        return;
      }
      setDeleteFailure(result.reason);
    });
  }

  return { confirmDeletion, isDeleting, deleteFailure, isAlreadyDeleted, clearDeleteFailure, clearAlreadyDeletedNotice };
}

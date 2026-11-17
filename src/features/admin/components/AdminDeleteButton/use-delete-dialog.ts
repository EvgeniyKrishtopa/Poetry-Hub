"use client";

import { useState, type RefObject } from "react";
import { flushSync } from "react-dom";

/**
 * Drives the confirmation dialog only: opening it, cancelling it, and closing it once the delete has succeeded while
 * the page is still on its way to the redirect. It knows nothing about the delete request itself.
 */
export function useDeleteDialog(dialogRef: RefObject<HTMLDialogElement | null>) {
  // The pending transition outlives the close (it stays pending through the navigation), so the dialog must be
  // allowed to close by itself while the page is leaving.
  const [isLeavingPage, setIsLeavingPage] = useState(false);

  function openConfirmDialog() {
    setIsLeavingPage(false);
    dialogRef.current?.showModal();
  }

  function closeConfirmDialog() {
    dialogRef.current?.close();
  }

  // `flushSync` commits the closable dialog before `close()`, so the close never races the Dialog's re-open guard.
  function closeConfirmDialogBeforeNavigation() {
    flushSync(() => setIsLeavingPage(true));
    dialogRef.current?.close();
  }

  return { openConfirmDialog, closeConfirmDialog, closeConfirmDialogBeforeNavigation, isLeavingPage };
}

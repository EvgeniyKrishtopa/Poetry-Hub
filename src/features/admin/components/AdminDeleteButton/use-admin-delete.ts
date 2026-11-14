"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type RefObject } from "react";
import { flushSync } from "react-dom";

import type { AdminDeleteKind, DeleteFailureReason } from "../../model/admin.types";

import { callDelete } from "./call-delete";

type ShownFailure = Exclude<DeleteFailureReason, "not-found">;

/**
 * Runs one delete and keeps what the dialog and the button show: the failure, or the «already gone» line. A success
 * closes the dialog and replaces the page with the redirect, since the page it showed no longer exists.
 */
export function useAdminDelete(
  kind: AdminDeleteKind,
  id: string,
  redirectHref: string,
  dialogRef: RefObject<HTMLDialogElement | null>,
) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [failure, setFailure] = useState<ShownFailure | null>(null);
  const [alreadyGone, setAlreadyGone] = useState(false);
  // The transition stays pending through the navigation, so closing must allow the dialog to close by itself.
  const [leaving, setLeaving] = useState(false);
  // Set synchronously: a second click can arrive before the pending state disables the button.
  const sendingRef = useRef(false);

  function open() {
    setLeaving(false);
    setAlreadyGone(false);
    dialogRef.current?.showModal();
  }

  function cancel() {
    dialogRef.current?.close();
  }

  // Every close path ends here: a dialog opened again starts without the failure.
  function handleClosed() {
    setFailure(null);
  }

  // `flushSync` commits the closable dialog before `close()`, so the close never races the Dialog's re-open guard.
  function closeWhilePending() {
    flushSync(() => setLeaving(true));
    dialogRef.current?.close();
  }

  function confirm() {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setFailure(null);
    startTransition(async () => {
      const result = await callDelete(kind, id);
      sendingRef.current = false;
      if (result.ok) {
        closeWhilePending();
        // `replace`, so Back does not return to the deleted page.
        router.replace(redirectHref);
        return;
      }
      if (result.reason === "not-found") {
        closeWhilePending();
        setAlreadyGone(true);
        return;
      }
      setFailure(result.reason);
    });
  }

  return { open, cancel, confirm, handleClosed, isPending, leaving, failure, alreadyGone };
}

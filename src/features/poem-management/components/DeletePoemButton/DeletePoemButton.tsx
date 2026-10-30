"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { flushSync } from "react-dom";

import { POEM_MANAGEMENT_PATH, SIGN_IN_PATH } from "@/shared/config/account-paths";
import { useSessionExpiredNotice } from "@/shared/lib/one-time-notice/session-expired-notice.store";
import { Alert, Button, Dialog } from "@/shared/ui";

import { deletePoemAction } from "../../actions/delete-poem.actions";
import { useDeletedPoemNotice } from "../../model/deleted-poem-notice-ui.store";
import { DELETE_POEM_COPY } from "../../model/poem-management-messages";
import { DELETE_POEM_STATUS } from "../../model/poem-management.constants";
import type { DeletePoemResult } from "../../model/poem-management.types";

import type { DeletePoemButtonProps } from "./DeletePoemButton.types";

/** The owner's delete button, its confirmation dialog, the action call, and the navigation (design D4). */
export function DeletePoemButton({ poemId, title }: DeletePoemButtonProps) {
  const router = useRouter();
  const setDeletedNotice = useDeletedPoemNotice((state) => state.setDeletedNotice);
  const markSessionExpired = useSessionExpiredNotice((state) => state.markSessionExpired);
  const [isPending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  // The transition stays pending through the navigation, so leaving must allow the dialog to close by itself.
  const [leaving, setLeaving] = useState(false);
  // Set synchronously on confirm: a second click can arrive before the pending state disables the button.
  const sendingRef = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  // A disabled button can't take focus, so focus waits for the request to end (NFR-4).
  useEffect(() => {
    if (failed && !isPending) confirmRef.current?.focus();
  }, [failed, isPending]);

  function open() {
    setLeaving(false);
    dialogRef.current?.showModal();
    cancelRef.current?.focus();
  }

  function cancel() {
    dialogRef.current?.close();
  }

  // Every close path ends here: a dialog opened again starts without the alert (FR-5).
  function handleClosed() {
    setFailed(false);
    openerRef.current?.focus();
  }

  // Closed first: the page left behind may stay mounted but hidden, and an open modal there would block the
  // next one. `flushSync` commits the closable dialog before `close()`, so the close never races the Dialog's
  // re-open guard. `replace`, so Back doesn't return to the deleted poem's page (FR-3).
  function leaveFor(path: string) {
    flushSync(() => setLeaving(true));
    dialogRef.current?.close();
    router.replace(path);
  }

  function handleResult(result: DeletePoemResult | undefined) {
    if (result?.status === DELETE_POEM_STATUS.deleted) {
      setDeletedNotice({ kind: "deleted", title });
      leaveFor(POEM_MANAGEMENT_PATH);
      return;
    }
    if (result?.status === DELETE_POEM_STATUS.notFound) {
      setDeletedNotice({ kind: "already-deleted" });
      leaveFor(POEM_MANAGEMENT_PATH);
      return;
    }
    if (result?.failure === "unauthenticated") {
      markSessionExpired();
      leaveFor(SIGN_IN_PATH);
      // The root layout's header still shows the signed-in links until the server renders it again.
      router.refresh();
      return;
    }
    // Any other failure, or no data at all (a server error or a rejected input).
    setFailed(true);
  }

  function confirm() {
    if (sendingRef.current) return;
    sendingRef.current = true;
    // The next attempt hides the previous failure (FR-5).
    setFailed(false);
    startTransition(async () => {
      let result: DeletePoemResult | undefined;
      try {
        result = (await deletePoemAction({ poemId })).data;
      } catch {
        result = undefined;
      } finally {
        sendingRef.current = false;
      }
      handleResult(result);
    });
  }

  return (
    <>
      <Button
        ref={openerRef}
        variant="danger"
        aria-haspopup="dialog"
        onClick={open}
        className="self-start"
      >
        {DELETE_POEM_COPY.open}
      </Button>
      <Dialog
        ref={dialogRef}
        title={DELETE_POEM_COPY.dialogTitle}
        description={DELETE_POEM_COPY.dialogBody(title)}
        closeLabel={DELETE_POEM_COPY.close}
        closable={!isPending || leaving}
        onClose={handleClosed}
      >
        {failed && <Alert tone="danger">{DELETE_POEM_COPY.failure}</Alert>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button ref={cancelRef} variant="ghost" disabled={isPending} onClick={cancel}>
            {DELETE_POEM_COPY.cancel}
          </Button>
          <Button ref={confirmRef} variant="danger" disabled={isPending} aria-busy={isPending} onClick={confirm}>
            {isPending ? DELETE_POEM_COPY.confirmPending : DELETE_POEM_COPY.confirm}
          </Button>
        </div>
      </Dialog>
    </>
  );
}

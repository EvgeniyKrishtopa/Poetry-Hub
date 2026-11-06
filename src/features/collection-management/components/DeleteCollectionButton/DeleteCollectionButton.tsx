"use client";

import { useRouter } from "next/navigation";
import { type MouseEvent, useEffect, useRef, useState, useTransition } from "react";
import { flushSync } from "react-dom";

import { POEM_MANAGEMENT_PATH, SIGN_IN_PATH } from "@/shared/config/account-paths";
import { CONNECTION_STATUS } from "@/shared/lib/network/network.constants";
import { useConnectionStatus } from "@/shared/lib/network/use-connection-status";
import { useSessionExpiredNotice } from "@/shared/lib/one-time-notice/session-expired-notice.store";
import { Alert, Button, ConnectionNotice, Dialog } from "@/shared/ui";

import { deleteCollectionAction } from "../../actions/delete-collection.actions";
import { useCollectionListNotice } from "../../model/collection-list-notice-ui.store";
import { COLLECTION_PAGE_COPY } from "../../model/collection-management-messages";
import { DELETE_COLLECTION_STATUS } from "../../model/collection-management.constants";
import type { DeleteCollectionResult } from "../../model/collection-management.types";

import type { DeleteCollectionButtonProps } from "./DeleteCollectionButton.types";

/** The danger opener, its confirmation `Dialog`, the delete call and its outcomes (design D7). */
export function DeleteCollectionButton({ collectionId, title }: DeleteCollectionButtonProps) {
  const router = useRouter();
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
  const connection = useConnectionStatus();
  // The transition's closure holds the status of the render that started it; the rejection reads the latest.
  const connectionRef = useRef(connection);
  useEffect(() => {
    connectionRef.current = connection;
  });
  const isOnline = connection === CONNECTION_STATUS.online;

  // A disabled button can't take focus, so focus waits for the request to end (NFR-4).
  useEffect(() => {
    if (failed && !isPending) confirmRef.current?.focus();
  }, [failed, isPending]);

  // `aria-disabled`, not `disabled`, while the connection isn't normal: the opener stays focusable, so focus
  // can return to it when the dialog closes (FR-14, design D7). A press is ignored here instead.
  function open(event: MouseEvent<HTMLButtonElement>) {
    if (!isOnline) {
      event.preventDefault();
      return;
    }
    setLeaving(false);
    dialogRef.current?.showModal();
    cancelRef.current?.focus();
  }

  function cancel() {
    dialogRef.current?.close();
  }

  // Every close path ends here: a dialog opened again starts without the alert.
  function handleClosed() {
    setFailed(false);
    openerRef.current?.focus();
  }

  // Closed first: the page left behind may stay mounted but hidden, and an open modal there would block the
  // next one. `flushSync` commits the closable dialog before `close()`, so the close never races the Dialog's
  // re-open guard. `replace`, so Back doesn't return to the deleted collection's page (FR-13, FR-15).
  function leaveFor(path: string) {
    flushSync(() => setLeaving(true));
    dialogRef.current?.close();
    router.replace(path);
  }

  // The notice stores are only written, after the answer: `getState()`, no subscription.
  function handleResult(result: DeleteCollectionResult | undefined) {
    if (result?.status === DELETE_COLLECTION_STATUS.deleted) {
      // The stored title the database returned, not the one this page rendered with.
      useCollectionListNotice.getState().setListNotice({ kind: "deleted", title: result.title });
      leaveFor(POEM_MANAGEMENT_PATH);
      return;
    }
    if (result?.status === DELETE_COLLECTION_STATUS.notFound) {
      useCollectionListNotice.getState().setListNotice({ kind: "already-deleted" });
      leaveFor(POEM_MANAGEMENT_PATH);
      return;
    }
    if (result?.failure === "unauthenticated") {
      useSessionExpiredNotice.getState().markSessionExpired();
      leaveFor(SIGN_IN_PATH);
      // The root layout's header still shows the signed-in links until the server renders it again.
      router.refresh();
      return;
    }
    // Any other failure, or no data at all (a server error or a rejected input).
    setFailed(true);
  }

  async function send() {
    let result: DeleteCollectionResult | undefined;
    try {
      result = (await deleteCollectionAction({ collectionId })).data;
    } catch (error) {
      // The error's type only: never the collection's content (NFR-5).
      console.error(`[collection-management] delete call rejected: ${error instanceof Error ? error.name : typeof error}`);
      // Offline: the live notice in the dialog already says why, so no failure text (FR-14).
      if (connectionRef.current !== CONNECTION_STATUS.offline) setFailed(true);
      return;
    }
    handleResult(result);
  }

  function confirm() {
    // Checked here as well as by the disabled button.
    if (!isOnline || sendingRef.current) return;
    sendingRef.current = true;
    // The next attempt hides the previous failure.
    setFailed(false);
    startTransition(async () => {
      try {
        await send();
      } finally {
        sendingRef.current = false;
      }
    });
  }

  return (
    <>
      <Button
        ref={openerRef}
        variant="danger"
        aria-haspopup="dialog"
        aria-disabled={isOnline ? undefined : true}
        onClick={open}
        className="self-start aria-disabled:opacity-50"
      >
        {COLLECTION_PAGE_COPY.delete}
      </Button>
      <Dialog
        ref={dialogRef}
        title={COLLECTION_PAGE_COPY.dialogTitle}
        description={COLLECTION_PAGE_COPY.dialogBody(title)}
        closeLabel={COLLECTION_PAGE_COPY.close}
        closable={!isPending || leaving}
        onClose={handleClosed}
      >
        {failed && <Alert tone="danger">{COLLECTION_PAGE_COPY.deleteFailure}</Alert>}
        {/* The page's own notice sits behind the modal, so the dialog shows one above its buttons (design D9). */}
        <ConnectionNotice status={connection} />
        <div className="flex flex-wrap justify-end gap-2">
          <Button ref={cancelRef} variant="ghost" disabled={isPending} onClick={cancel}>
            {COLLECTION_PAGE_COPY.cancel}
          </Button>
          <Button
            ref={confirmRef}
            variant="danger"
            disabled={isPending || !isOnline}
            aria-busy={isPending}
            onClick={confirm}
          >
            {isPending ? COLLECTION_PAGE_COPY.confirmPending : COLLECTION_PAGE_COPY.confirm}
          </Button>
        </div>
      </Dialog>
    </>
  );
}

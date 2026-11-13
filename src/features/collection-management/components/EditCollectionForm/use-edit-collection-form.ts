import { useRouter } from "next/navigation";
import { type FormEvent, type RefObject, useEffect, useRef, useState, useTransition } from "react";

import { POEM_MANAGEMENT_PATH, SIGN_IN_PATH } from "@/shared/config/account-paths";
import { CONNECTION_STATUS } from "@/shared/lib/network/network.constants";
import { useConnection } from "@/shared/lib/network/use-connection";
import type { ConnectionStatus } from "@/shared/lib/network/use-connection-status";
import { useSessionExpiredNotice } from "@/shared/lib/one-time-notice/session-expired-notice.store";

import { updateCollectionAction } from "../../actions/update-collection.actions";
import { useCollectionForm } from "../../hooks/use-collection-form";
import type { CollectionFormState } from "../../hooks/use-collection-form.types";
import { useLeaveGuard } from "../../hooks/use-leave-guard";
import type { CollectionFormValues } from "../../model/collection-form-values";
import { useCollectionListNotice } from "../../model/collection-list-notice-ui.store";
import { UPDATE_COLLECTION_STATUS } from "../../model/collection-management.constants";
import type { UpdateCollectionFailure, UpdateCollectionResult } from "../../model/collection-management.types";
import { collectionPath, editCollectionPath } from "../../model/collection-paths";
import { useSavedCollectionNotice } from "../../model/saved-collection-notice-ui.store";
import type { CollectionLeaveDialogProps } from "../CollectionLeaveDialog/CollectionLeaveDialog.types";

import type { EditCollectionFormProps } from "./EditCollectionForm.types";
import { useLeavePrompt } from "./use-leave-prompt";

/** A failure the alert above the form shows; the session-expired one navigates instead (design D6). */
type CollectionSaveAlertFailure = Exclude<UpdateCollectionFailure, "unauthenticated">;

/** Everything `EditCollectionForm` renders from (design D6). */
export interface EditCollectionFormModel {
  readonly form: CollectionFormState;
  readonly failure: CollectionSaveAlertFailure | null;
  readonly isPending: boolean;
  /** The live connection status, for the notice above the form (design D9). */
  readonly connection: ConnectionStatus;
  /** Online and not saved yet: the save button's enabled state. */
  readonly canSave: boolean;
  /** Its fields are found by `name` to move focus. */
  readonly formRef: RefObject<HTMLFormElement | null>;
  readonly alertRef: RefObject<HTMLDivElement | null>;
  /** The back link's ref: it takes focus as it mounts after a discard (FR-8). */
  readonly backLinkRef: (link: HTMLAnchorElement | null) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly onDiscard: () => void;
  /** The leave dialog, open while the guard holds the author on the page (design D12). */
  readonly leaveDialog: CollectionLeaveDialogProps;
}

/** A new object per failure, so the same failure twice moves focus to the alert twice. */
interface FailureAlert {
  readonly failure: CollectionSaveAlertFailure;
}

/** A rejected call: what happened to the request is unknown, so nothing on the page changes beyond the alert. */
const REJECTED = "rejected";

type SaveOutcome = UpdateCollectionResult | undefined | typeof REJECTED;

/** The edit form's logic: the shared fields, the update call and every outcome, discard, and the guard (design D6). */
export function useEditCollectionForm({ collectionId, stored }: EditCollectionFormProps): EditCollectionFormModel {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { status: connection, isOnline } = useConnection();
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const form = useCollectionForm(stored, { isPending, formRef });
  const [failureAlert, setFailureAlert] = useState<FailureAlert | null>(null);
  const handledAlertRef = useRef<FailureAlert | null>(null);
  // Set by a `saved` result, before the navigation: it turns the leave guard off for that navigation (design D12).
  const [saved, setSaved] = useState(false);
  // Set synchronously on submit: a second click can arrive before the pending state disables the form.
  const sendingRef = useRef(false);
  // Set by discard: the back link it brings back takes focus as it mounts.
  const focusBackLinkRef = useRef(false);
  // The transition's closure holds the status of the render that started it; the rejection reads the latest.
  const connectionRef = useRef(connection);
  useEffect(() => {
    connectionRef.current = connection;
  });

  const failure = failureAlert?.failure ?? null;

  // The fieldset is disabled while sending: focus moves once the form is enabled again (NFR-4).
  useEffect(() => {
    if (isPending || failureAlert === null || handledAlertRef.current === failureAlert) return;
    handledAlertRef.current = failureAlert;
    alertRef.current?.focus();
  }, [isPending, failureAlert]);

  const { dialog: leaveDialog, openForLink, askToLeave, closePrompt } = useLeavePrompt({
    hasFailure: failure !== null,
    alertRef,
  });
  useLeaveGuard({
    // On while a save is sending too: its `saved` result would pull an author who left back here (design D12).
    active: (form.isChanged || isPending) && !saved,
    // This collection's own pages, the edit page included, so a same-page `#` link is never blocked.
    isAllowed: (pathname) => pathname === collectionPath(collectionId) || pathname === editCollectionPath(collectionId),
    onBlocked: openForLink,
    askToLeave,
    closePrompt,
  });

  function showFailure(next: CollectionSaveAlertFailure) {
    setFailureAlert({ failure: next });
  }

  // The notice stores are only written, after the answer: `getState()`, no subscription.
  function handleOutcome(outcome: SaveOutcome) {
    if (outcome === REJECTED) {
      // Offline: the live notice already says why, so no alert is kept (FR-14).
      if (connectionRef.current !== CONNECTION_STATUS.offline) showFailure("unknown");
      return;
    }
    // No data: a malformed request or a rejected body, which the form never sends on purpose.
    if (outcome === undefined) {
      showFailure("unknown");
      return;
    }
    switch (outcome.status) {
      case UPDATE_COLLECTION_STATUS.saved:
        setSaved(true);
        useSavedCollectionNotice.getState().setSavedNotice({ collectionId });
        // `push`: Back returns to the edit page, already reset to the saved values (FR-9).
        router.push(collectionPath(collectionId));
        return;
      case UPDATE_COLLECTION_STATUS.invalid:
        form.showFieldErrors(outcome.fieldErrors);
        return;
      case UPDATE_COLLECTION_STATUS.notFound:
        useCollectionListNotice.getState().setListNotice({ kind: "already-deleted" });
        router.replace(POEM_MANAGEMENT_PATH);
        return;
      case UPDATE_COLLECTION_STATUS.failed:
        if (outcome.failure === "unauthenticated") {
          useSessionExpiredNotice.getState().markSessionExpired();
          router.replace(SIGN_IN_PATH);
          // The root layout's header still shows the signed-in links until the server renders it again.
          router.refresh();
          return;
        }
        showFailure(outcome.failure);
    }
  }

  async function send(values: CollectionFormValues) {
    let outcome: SaveOutcome;
    try {
      outcome = (await updateCollectionAction({ collectionId, ...values })).data;
    } catch (error) {
      // The error's type only: never the collection's content (NFR-5).
      console.error(`[collection-management] save call rejected: ${error instanceof Error ? error.name : typeof error}`);
      outcome = REJECTED;
    }
    handleOutcome(outcome);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Enter in a field submits too, even while the save button is hidden or disabled. Saved: the transition
    // ends before the navigation does, and a second save would spend an attempt.
    if (!form.isChanged || !isOnline || saved || sendingRef.current) return;
    // The next submit hides the previous outcome.
    setFailureAlert(null);
    const check = form.validate();
    if (!check.ok) return;

    sendingRef.current = true;
    startTransition(async () => {
      try {
        await send(check.values);
      } finally {
        sendingRef.current = false;
      }
    });
  }

  function onDiscard() {
    focusBackLinkRef.current = true;
    setFailureAlert(null);
    form.reset();
  }

  function backLinkRef(link: HTMLAnchorElement | null) {
    if (link === null || !focusBackLinkRef.current) return;
    focusBackLinkRef.current = false;
    link.focus();
  }

  return {
    form,
    failure,
    isPending,
    connection,
    canSave: isOnline && !saved,
    formRef,
    alertRef,
    backLinkRef,
    onSubmit,
    onDiscard,
    leaveDialog,
  };
}

import { useRouter } from "next/navigation";
import { type FormEvent, type RefObject, useEffect, useRef, useState, useTransition } from "react";

import { POEM_MANAGEMENT_PATH, SIGN_IN_PATH } from "@/shared/config/account-paths";
import { CONNECTION_STATUS } from "@/shared/lib/network/network.constants";
import { type ConnectionStatus, useConnectionStatus } from "@/shared/lib/network/use-connection-status";
import { useSessionExpiredNotice } from "@/shared/lib/one-time-notice/session-expired-notice.store";

import { updatePoemAction } from "../../actions/update-poem.actions";
import { usePoemForm } from "../../hooks/use-poem-form";
import type { PoemFormState } from "../../hooks/use-poem-form.types";
import { useCreatedPoemNotice } from "../../model/created-poem-notice-ui.store";
import { useDeletedPoemNotice } from "../../model/deleted-poem-notice-ui.store";
import { illustrationChangeOf } from "../../model/poem-form-values";
import { UPDATE_POEM_STATUS } from "../../model/poem-management.constants";
import type { SaveAlertFailure, UpdatePoemResult } from "../../model/poem-management.types";
import { editPoemPath, ownPoemPath } from "../../model/poem-paths";
import type { LeaveBlockedDialogProps } from "../LeaveBlockedDialog/LeaveBlockedDialog.types";

import type { EditPoemFormProps } from "./EditPoemForm.types";
import { useLeaveGuard } from "./use-leave-guard";
import { useLeavePrompt } from "./use-leave-prompt";

/** Everything the edit form renders from; the component holds no logic of its own (PR #169 review). */
export interface EditPoemFormModel {
  /** The shared fields' state, for `PoemFormFields`. */
  readonly fields: PoemFormState<SaveAlertFailure>;
  readonly failure: SaveAlertFailure | null;
  /** Derived on every render: save and discard while changed, the back link otherwise (design D5). */
  readonly isChanged: boolean;
  readonly isPending: boolean;
  /** The live connection status, for the notice above the form (design D8). */
  readonly connection: ConnectionStatus;
  /** Online and not saved yet: the save button's enabled state (FR-11, CR-01). */
  readonly canSave: boolean;
  readonly formRef: RefObject<HTMLFormElement | null>;
  readonly alertRef: RefObject<HTMLDivElement | null>;
  /** The back link's ref: it takes focus as it mounts after a discard (FR-3). */
  readonly backLinkRef: (link: HTMLAnchorElement | null) => void;
  readonly onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly onDiscard: () => void;
  /** The leave dialog, open while the guard holds the author on the page (design D10). */
  readonly leaveDialog: LeaveBlockedDialogProps;
}

/** A rejected call: what happened to the request is unknown, so nothing on the page changes beyond the alert. */
const REJECTED = "rejected";

type SaveOutcome = UpdatePoemResult | undefined | typeof REJECTED;

/**
 * The edit form's logic: the shared fields, the update call and every outcome (stores, navigation, alert,
 * offline), and discard (edit-poem design D4, D5, D7, D8).
 */
export function useEditPoemForm({ poemId, stored, genres }: EditPoemFormProps): EditPoemFormModel {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const connection = useConnectionStatus();
  const formRef = useRef<HTMLFormElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const fields = usePoemForm<SaveAlertFailure>(stored, genres, { isPending, formRef, alertRef });
  const { values, isChanged, failure, validate, recheckIllustration, showFieldErrors, showFailure, reset } = fields;
  // Set by a `saved` result, before the navigation: it turns the leave guard off for that navigation (design D10).
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

  const isOnline = connection === CONNECTION_STATUS.online;

  const { dialog: leaveDialog, openForLink, askToLeave, closePrompt } = useLeavePrompt({
    hasFailure: failure !== null,
    alertRef,
  });
  useLeaveGuard({
    // On while a save is sending too: its `saved` result would pull an author who left back here (design D10).
    active: (isChanged || isPending) && !saved,
    // This poem's own pages, the edit page included, so a same-page `#` link is never blocked.
    isAllowed: (pathname) => pathname === ownPoemPath(poemId) || pathname === editPoemPath(poemId),
    onBlocked: openForLink,
    askToLeave,
    closePrompt,
  });

  // The notice stores are only written, after the answer: `getState()`, no subscription.
  function handleOutcome(outcome: SaveOutcome) {
    if (outcome === REJECTED) {
      // Offline: the live notice already says why, so no alert is kept (FR-11).
      if (connectionRef.current !== CONNECTION_STATUS.offline) showFailure("unknown");
      return;
    }
    // No data: a malformed request or a rejected body, which the form never sends on purpose.
    if (outcome === undefined) {
      showFailure("unknown");
      return;
    }
    switch (outcome.status) {
      case UPDATE_POEM_STATUS.saved:
        setSaved(true);
        useCreatedPoemNotice.getState().setPoemNotice({ poemId, kind: "saved" });
        // `push`: Back returns to the edit page, already reset to the saved values (design D7).
        router.push(ownPoemPath(poemId));
        return;
      case UPDATE_POEM_STATUS.invalid:
        showFieldErrors(outcome.fieldErrors);
        return;
      case UPDATE_POEM_STATUS.notFound:
        useDeletedPoemNotice.getState().setDeletedNotice({ kind: "already-deleted" });
        router.replace(POEM_MANAGEMENT_PATH);
        return;
      case UPDATE_POEM_STATUS.failed:
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

  async function send() {
    if (!(await recheckIllustration())) return;
    const { title, text, genreId, illustration } = values;
    let outcome: SaveOutcome;
    try {
      const file = illustration.kind === "new" ? illustration.draft.file : undefined;
      const illustrationChange = illustrationChangeOf(illustration);
      outcome = (await updatePoemAction({ poemId, title, text, genreId, illustrationChange, illustration: file }))
        .data;
    } catch (error) {
      // The error's type only: never the poem's content (NFR-10).
      console.error(`[poem-management] save call rejected: ${error instanceof Error ? error.name : typeof error}`);
      outcome = REJECTED;
    }
    handleOutcome(outcome);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Enter in a field submits too, even while the save button is hidden or disabled. Saved: the transition
    // ends before the navigation does, and a second save would spend an attempt (CR-01).
    if (!isChanged || !isOnline || saved || sendingRef.current || !validate()) return;

    sendingRef.current = true;
    startTransition(async () => {
      try {
        await send();
      } finally {
        sendingRef.current = false;
      }
    });
  }

  function onDiscard() {
    focusBackLinkRef.current = true;
    reset();
  }

  function backLinkRef(link: HTMLAnchorElement | null) {
    if (link === null || !focusBackLinkRef.current) return;
    focusBackLinkRef.current = false;
    link.focus();
  }

  return {
    fields,
    failure,
    isChanged,
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

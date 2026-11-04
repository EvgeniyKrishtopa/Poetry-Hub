import { useRouter } from "next/navigation";
import { type TransitionStartFunction, useEffect, useRef, useState } from "react";

import { POEM_MANAGEMENT_PATH, SIGN_IN_PATH } from "@/shared/config/account-paths";
import { useSessionExpiredNotice } from "@/shared/lib/one-time-notice/session-expired-notice.store";
import { CONNECTION_STATUS } from "@/shared/lib/network/network.constants";
import type { ConnectionStatus } from "@/shared/lib/network/use-connection-status";

import { updatePoemAction } from "../../actions/update-poem.actions";
import { useCreatedPoemNotice } from "../../model/created-poem-notice-ui.store";
import { useDeletedPoemNotice } from "../../model/deleted-poem-notice-ui.store";
import { illustrationChangeOf } from "../../model/poem-form-values";
import { UPDATE_POEM_STATUS } from "../../model/poem-management.constants";
import type { SaveAlertFailure, UpdatePoemResult } from "../../model/poem-management.types";
import { ownPoemPath } from "../../model/poem-paths";
import type { PoemFormState } from "../../hooks/use-poem-form.types";

export interface SavePoemOptions {
  readonly poemId: string;
  readonly form: PoemFormState<SaveAlertFailure>;
  /** The form's own transition: its pending state also disables the fieldset and holds focus back. */
  readonly startTransition: TransitionStartFunction;
  /** The live connection status; a call rejected while it is `offline` shows no alert (design D8). */
  readonly connection: ConnectionStatus;
}

/** The save call's state for the form (edit-poem design D7). */
export interface SavePoem {
  /** Set by a `saved` result, before the navigation, so the leave guard lets it through. */
  readonly saved: boolean;
  readonly submit: () => void;
}

/** A rejected call: what happened to the request is unknown, so nothing on the page changes beyond the alert. */
const REJECTED = "rejected";

type SaveOutcome = UpdatePoemResult | undefined | typeof REJECTED;

/** Calls `updatePoemAction` and routes every outcome: stores, navigation, alert, offline (edit-poem design D7). */
export function useSavePoem({ poemId, form, startTransition, connection }: SavePoemOptions): SavePoem {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  // Set synchronously on submit: a second click can arrive before the pending state disables the form.
  const sendingRef = useRef(false);
  // The transition's closure holds the status of the render that started it; the rejection reads the latest.
  const connectionRef = useRef(connection);
  useEffect(() => {
    connectionRef.current = connection;
  });

  // The notice stores are only written, after the answer: `getState()`, no subscription.
  function handleOutcome(outcome: SaveOutcome) {
    if (outcome === REJECTED) {
      // Offline: the live notice already says why, so no alert is kept (FR-11).
      if (connectionRef.current !== CONNECTION_STATUS.offline) form.showFailure("unknown");
      return;
    }
    // No data: a malformed request or a rejected body, which the form never sends on purpose.
    if (outcome === undefined) {
      form.showFailure("unknown");
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
        form.showFieldErrors(outcome.fieldErrors);
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
        form.showFailure(outcome.failure);
    }
  }

  async function send() {
    if (!(await form.recheckIllustration())) return;
    const { title, text, genreId, illustration } = form.values;
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

  function submit() {
    // Saved: the transition ends before the navigation does, and a second save would spend an attempt (CR-01).
    if (saved || sendingRef.current || !form.validate()) return;

    sendingRef.current = true;
    startTransition(async () => {
      try {
        await send();
      } finally {
        sendingRef.current = false;
      }
    });
  }

  return { saved, submit };
}

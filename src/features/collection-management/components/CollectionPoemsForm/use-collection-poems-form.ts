import { useRouter } from "next/navigation";
import { type RefObject, useEffect, useRef, useState, useTransition } from "react";

import { POEM_MANAGEMENT_PATH, SIGN_IN_PATH } from "@/shared/config/account-paths";
import { CONNECTION_STATUS } from "@/shared/lib/network/network.constants";
import { type ConnectionStatus, useConnectionStatus } from "@/shared/lib/network/use-connection-status";
import { useSessionExpiredNotice } from "@/shared/lib/one-time-notice/session-expired-notice.store";

import { saveCollectionPoemsAction } from "../../actions/save-collection-poems.actions";
import { useLeaveGuard } from "../../hooks/use-leave-guard";
import { useCollectionListNotice } from "../../model/collection-list-notice-ui.store";
import { SAVE_COLLECTION_POEMS_STATUS } from "../../model/collection-management.constants";
import type {
  CollectionPoemChoice,
  SaveCollectionPoemsFailure,
  SaveCollectionPoemsOutcome,
  SelectionDiff,
} from "../../model/collection-management.types";
import { collectionPoemsPath } from "../../model/collection-paths";
import { isSelectionChanged, selectionDiff, storedSelection } from "../../model/collection-poems-selection";
import type { CollectionPoemsLeaveDialogProps } from "../CollectionPoemsLeaveDialog/CollectionPoemsLeaveDialog.types";

import { useCollectionPoemsLeavePrompt } from "./use-collection-poems-leave-prompt";

/** The page's failure alert: the save failures that stay on the page, plus the stale selection (add-poems-to-collections D6). */
export type CollectionPoemsAlert = Exclude<SaveCollectionPoemsFailure, "unauthenticated"> | "stale";

/** Runs with a save's outcome before the form changes any state, so the leave dialog answers first (Gate 1 C1). */
export type BeforeSaveHandled = (outcome: SaveCollectionPoemsOutcome) => void;

export interface CollectionPoemsFormOptions {
  readonly collectionId: string;
  readonly choices: readonly CollectionPoemChoice[];
}

export interface CollectionPoemsFormModel {
  /** `draft ?? stored`: the boxes shown checked. */
  readonly checked: ReadonlySet<string>;
  readonly isChanged: boolean;
  readonly isPending: boolean;
  /** The live connection status, for the notice above the list (design D8). */
  readonly connection: ConnectionStatus;
  /** Online and not sending: the checkboxes' enabled state (FR-9). */
  readonly canEdit: boolean;
  /** Changed, online, and not sending: the save button's enabled state. */
  readonly canSave: boolean;
  /** A save succeeded since the page opened: the save button stays shown, and the back link shows while unchanged. */
  readonly hasSaved: boolean;
  /** The saved notice: from a `saved` result until the next checkbox change (FR-6). */
  readonly showSavedNotice: boolean;
  readonly alert: CollectionPoemsAlert | null;
  readonly alertRef: RefObject<HTMLDivElement | null>;
  readonly toggle: (poemId: string) => void;
  /** Starts the save, or joins the one already sending; resolves once the form has handled the outcome. */
  readonly save: (beforeHandled?: BeforeSaveHandled) => Promise<SaveCollectionPoemsOutcome>;
  /** The leave dialog, open while the guard holds the author on the page (design D7). */
  readonly leaveDialog: CollectionPoemsLeaveDialogProps;
}

/** A new object per failure, so the same failure twice moves focus to the alert twice. */
interface FailureAlert {
  readonly alert: CollectionPoemsAlert;
}

/**
 * The save sending now, or answered but not yet committed: a second caller joins it instead of sending another
 * (FR-6, FR-10). `outcome` is set once the answer arrives, so a caller joining after it gets its callback at once.
 */
interface SaveInFlight {
  readonly promise: Promise<SaveCollectionPoemsOutcome>;
  readonly beforeHandled: BeforeSaveHandled[];
  outcome?: SaveCollectionPoemsOutcome;
}

const REJECTED: SaveCollectionPoemsOutcome = { status: "rejected" };

const UNKNOWN_FAILURE: SaveCollectionPoemsOutcome = { status: SAVE_COLLECTION_POEMS_STATUS.failed, failure: "unknown" };

/** The ids in `draft` that still have a checkbox: a poem gone from `choices` neither counts nor sends (FR-12). */
function visibleDraft(choices: readonly CollectionPoemChoice[], draft: ReadonlySet<string>): ReadonlySet<string> {
  return new Set(choices.map((choice) => choice.id).filter((id) => draft.has(id)));
}

async function sendSave(collectionId: string, diff: SelectionDiff): Promise<SaveCollectionPoemsOutcome> {
  try {
    const response = await saveCollectionPoemsAction({
      collectionId,
      added: [...diff.added],
      removed: [...diff.removed],
    });
    // No data: a server error or a rejected body, which the form never sends on purpose.
    return response.data ?? UNKNOWN_FAILURE;
  } catch (error) {
    // The error's type only: never an id or a title (NFR-5).
    console.error(`[collection-management] save collection poems call rejected: ${error instanceof Error ? error.name : typeof error}`);
    return REJECTED;
  }
}

/**
 * The selection (`draft: Set | null`, null following the stored set), the save call and its outcomes, reset inside
 * the action's transition, and the leave guard with its dialog (add-poems-to-collections D5 – D7).
 */
export function useCollectionPoemsForm({ collectionId, choices }: CollectionPoemsFormOptions): CollectionPoemsFormModel {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const connection = useConnectionStatus();
  const [draft, setDraft] = useState<ReadonlySet<string> | null>(null);
  const [hasSaved, setHasSaved] = useState(false);
  const [showSavedNotice, setShowSavedNotice] = useState(false);
  const [failureAlert, setFailureAlert] = useState<FailureAlert | null>(null);
  const handledAlertRef = useRef<FailureAlert | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  // Set synchronously on save: a double click, or the dialog opened meanwhile, joins it (FR-6, FR-10). Kept until
  // the transition ends, since `isPending` stays true after the answer until the outcome commits.
  const inFlightRef = useRef<SaveInFlight | null>(null);
  useEffect(() => {
    if (!isPending) inFlightRef.current = null;
  }, [isPending]);
  // The transition's closure holds the status of the render that started it; the rejection reads the latest.
  const connectionRef = useRef(connection);
  useEffect(() => {
    connectionRef.current = connection;
  });

  const stored = storedSelection(choices);
  const checked = draft ?? stored;
  const isChanged = draft !== null && isSelectionChanged(stored, visibleDraft(choices, draft));
  const isOnline = connection === CONNECTION_STATUS.online;
  const canSave = isChanged && isOnline && !isPending;

  // The checkboxes are disabled while sending: focus moves once they are enabled again (NFR-4).
  useEffect(() => {
    if (isPending || failureAlert === null || handledAlertRef.current === failureAlert) return;
    handledAlertRef.current = failureAlert;
    alertRef.current?.focus();
  }, [isPending, failureAlert]);

  function showFailure(alert: CollectionPoemsAlert) {
    setFailureAlert({ alert });
  }

  // The notice stores are only written, after the answer: `getState()`, no subscription.
  function handleOutcome(outcome: SaveCollectionPoemsOutcome) {
    switch (outcome.status) {
      case "rejected":
        // Offline: the live notice already says why, so no alert is kept (FR-9).
        if (connectionRef.current !== CONNECTION_STATUS.offline) showFailure("unknown");
        return;
      case SAVE_COLLECTION_POEMS_STATUS.saved:
        // Committed with the refreshed payload in this transition: the old selection never paints (Gate 1 P1).
        setDraft(null);
        setHasSaved(true);
        setShowSavedNotice(true);
        return;
      case SAVE_COLLECTION_POEMS_STATUS.stale:
        setDraft(null);
        showFailure("stale");
        return;
      case SAVE_COLLECTION_POEMS_STATUS.notFound:
        useCollectionListNotice.getState().setListNotice({ kind: "already-deleted" });
        router.replace(POEM_MANAGEMENT_PATH);
        return;
      case SAVE_COLLECTION_POEMS_STATUS.failed:
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

  function save(beforeHandled?: BeforeSaveHandled): Promise<SaveCollectionPoemsOutcome> {
    const inFlight = inFlightRef.current;
    if (inFlight !== null) {
      if (beforeHandled !== undefined) {
        // Answered already: run the callback now, still before the outcome commits (Gate 1 C1).
        if (inFlight.outcome === undefined) inFlight.beforeHandled.push(beforeHandled);
        else beforeHandled(inFlight.outcome);
      }
      return inFlight.promise;
    }
    // The button and the dialog's save are disabled here; nothing is sent, as when the request never left.
    if (!canSave || draft === null) return Promise.resolve(REJECTED);

    // The next save hides the previous outcome.
    setFailureAlert(null);
    const diff = selectionDiff(choices, stored, draft);
    const listeners: BeforeSaveHandled[] = beforeHandled === undefined ? [] : [beforeHandled];
    let settle: (outcome: SaveCollectionPoemsOutcome) => void = () => undefined;
    const promise = new Promise<SaveCollectionPoemsOutcome>((resolve) => {
      settle = resolve;
    });
    const inFlightSave: SaveInFlight = { promise, beforeHandled: listeners };
    inFlightRef.current = inFlightSave;

    startTransition(async () => {
      const outcome = await sendSave(collectionId, diff);
      inFlightSave.outcome = outcome;
      for (const listener of listeners) listener(outcome);
      // Updates after an `await` leave the transition unless wrapped again: unwrapped, the reset would paint the
      // old stored selection before the refreshed payload commits (Gate 1 P1).
      startTransition(() => handleOutcome(outcome));
      settle(outcome);
    });
    return promise;
  }

  function toggle(poemId: string) {
    const next = new Set(checked);
    if (next.has(poemId)) next.delete(poemId);
    else next.add(poemId);
    setDraft(next);
    setShowSavedNotice(false);
  }

  const { dialog: leaveDialog, openForLink, askToLeave, closePrompt } = useCollectionPoemsLeavePrompt({
    save,
    isPending,
    connection,
    // The leave-without-saving button drops the selection; unchanged, the guard turns off.
    releaseGuard: () => setDraft(null),
  });
  useLeaveGuard({
    // On while a save is sending too: its result would otherwise land on a page the author already left (D7).
    active: isChanged || isPending,
    isAllowed: (pathname) => pathname === collectionPoemsPath(collectionId),
    onBlocked: openForLink,
    askToLeave,
    closePrompt,
  });

  return {
    checked,
    isChanged,
    isPending,
    connection,
    canEdit: isOnline && !isPending,
    canSave,
    hasSaved,
    showSavedNotice,
    alert: failureAlert?.alert ?? null,
    alertRef,
    toggle,
    save,
    leaveDialog,
  };
}

import { useRouter } from "next/navigation";
import { startTransition, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { LEAVE_ANSWER, type LeaveAnswer } from "@/shared/lib/leave-guard/leave-guard.constants";
import { CONNECTION_STATUS } from "@/shared/lib/network/network.constants";
import type { ConnectionStatus } from "@/shared/lib/network/use-connection-status";

import { SAVE_COLLECTION_POEMS_STATUS } from "../../model/collection-management.constants";
import type { CollectionPoemsLeaveReason, SaveCollectionPoemsOutcome } from "../../model/collection-management.types";
import type { CollectionPoemsLeaveDialogProps } from "../CollectionPoemsLeaveDialog/CollectionPoemsLeaveDialog.types";

export interface CollectionPoemsLeavePromptHost {
  /** The form's save, or the one already sending; the callback runs before the form handles the outcome. */
  readonly save: (beforeHandled?: (outcome: SaveCollectionPoemsOutcome) => void) => Promise<SaveCollectionPoemsOutcome>;
  /** A save already sending: the dialog waits for it instead of offering a choice. */
  readonly isPending: boolean;
  /** Online: the dialog's save button is enabled and takes focus on open; otherwise the stay button does (FR-9). */
  readonly connection: ConnectionStatus;
  /** Drops the selection, which turns the guard off, before the dialog follows a link. */
  readonly releaseGuard: () => void;
}

/** The leave dialog's props, and the three callbacks the guard takes. */
export interface CollectionPoemsLeavePrompt {
  readonly dialog: CollectionPoemsLeaveDialogProps;
  /** The guard's `onBlocked`: opens the link form with where the link led. */
  readonly openForLink: (href: string) => void;
  /** The guard's `askToLeave`: opens the sign-out form and answers with the author's choice. */
  readonly askToLeave: () => Promise<LeaveAnswer>;
  /** The guard's `closePrompt`: the page closes the dialog itself (saved, hidden, unmounted). */
  readonly closePrompt: () => void;
}

const INITIAL_REASON: CollectionPoemsLeaveReason = { kind: "link", href: "" };

/**
 * Opens the dialog, runs or waits for the save, and answers or navigates (add-poems-to-collections D7). After a
 * save from the sign-out form, `leave` is answered before the form resets the selection: the reset turns the
 * guard off, and the guard dismisses whatever is still pending then (Gate 1 C1).
 */
export function useCollectionPoemsLeavePrompt(host: CollectionPoemsLeavePromptHost): CollectionPoemsLeavePrompt {
  const router = useRouter();
  const [reason, setReason] = useState<CollectionPoemsLeaveReason>(INITIAL_REASON);
  // The dialog's own sending state, so it can allow closing in the same tick it closes (the shared `Dialog`).
  const [isSaving, setIsSaving] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const saveRef = useRef<HTMLButtonElement>(null);
  const stayRef = useRef<HTMLButtonElement>(null);
  // Where focus goes back after the stay button in the link form: whatever had it when the link was clicked.
  const openerRef = useRef<Element | null>(null);
  // What the close means; ×, Escape, and the backdrop leave it at `stay`.
  const answerRef = useRef<LeaveAnswer>(LEAVE_ANSWER.stay);
  const settleRef = useRef<((answer: LeaveAnswer) => void) | null>(null);
  // The element `open` showed: a hidden `Activity` detaches `dialogRef` before the guard's cleanup asks to close.
  const shownDialogRef = useRef<HTMLDialogElement | null>(null);

  function settle(answer: LeaveAnswer) {
    settleRef.current?.(answer);
    settleRef.current = null;
  }

  function closeWith(answer: LeaveAnswer) {
    answerRef.current = answer;
    shownDialogRef.current?.close();
  }

  /** Runs the save from the dialog, or waits for the one already sending, then continues (FR-10). */
  async function saveThenContinue(target: CollectionPoemsLeaveReason) {
    setIsSaving(true);
    const outcome = await host.save((result) => {
      // Before the form resets the selection: the guard still waits for this answer (Gate 1 C1).
      if (result.status === SAVE_COLLECTION_POEMS_STATUS.saved && target.kind === "sign-out") settle(LEAVE_ANSWER.leave);
    });
    // Closable again before the close, so the shared `Dialog` doesn't re-open itself.
    flushSync(() => setIsSaving(false));
    if (outcome.status !== SAVE_COLLECTION_POEMS_STATUS.saved) {
      // The page shows the outcome, as for a save from its own button (FR-8).
      closeWith(LEAVE_ANSWER.dismissed);
      return;
    }
    closeWith(LEAVE_ANSWER.leave);
    if (target.kind === "link") router.push(target.href);
  }

  function open(next: CollectionPoemsLeaveReason) {
    // The right form is in the DOM before the dialog opens and its button takes focus.
    flushSync(() => setReason(next));
    answerRef.current = LEAVE_ANSWER.stay;
    const dialog = dialogRef.current;
    shownDialogRef.current = dialog;
    if (dialog !== null && !dialog.open) dialog.showModal();
    if (host.isPending) {
      // A save is already sending: the dialog waits for it and sends nothing itself.
      void saveThenContinue(next);
      return;
    }
    (host.connection === CONNECTION_STATUS.online ? saveRef : stayRef).current?.focus();
  }

  function openForLink(href: string) {
    openerRef.current = document.activeElement;
    open({ kind: "link", href });
  }

  function askToLeave(): Promise<LeaveAnswer> {
    // One question at a time: a newer one settles the earlier, whose late answer the guard ignores.
    settle(LEAVE_ANSWER.dismissed);
    return new Promise((resolve) => {
      settleRef.current = resolve;
      open({ kind: "sign-out" });
    });
  }

  function onLeave() {
    if (reason.kind === "sign-out") {
      closeWith(LEAVE_ANSWER.leave);
      return;
    }
    const { href } = reason;
    closeWith(LEAVE_ANSWER.leave);
    // One transition: the dropped selection commits with the next page, so it never paints here first.
    startTransition(() => {
      host.releaseGuard();
      router.push(href);
    });
  }

  function onClosed() {
    const answer = answerRef.current;
    if (answer !== LEAVE_ANSWER.stay) {
      // `leave`, or `dismissed`: the page closed the dialog itself and nothing here takes focus.
      settle(answer);
      return;
    }
    if (settleRef.current !== null) {
      // The sign-out form: the header's sign-out button takes focus back itself on `stay`.
      settle(LEAVE_ANSWER.stay);
      return;
    }
    if (openerRef.current instanceof HTMLElement) openerRef.current.focus();
  }

  return {
    dialog: {
      dialogRef,
      saveRef,
      stayRef,
      reason,
      isSaving,
      connection: host.connection,
      onSave: () => void saveThenContinue(reason),
      onLeave,
      onStay: () => closeWith(LEAVE_ANSWER.stay),
      onClosed,
    },
    openForLink,
    askToLeave,
    closePrompt: () => {
      if (!shownDialogRef.current?.open) return;
      setIsSaving(false);
      closeWith(LEAVE_ANSWER.dismissed);
    },
  };
}

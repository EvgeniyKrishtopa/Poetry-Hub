import { type RefObject, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { LEAVE_ANSWER, type LeaveAnswer } from "@/shared/lib/leave-guard/leave-guard.constants";

import { LEAVE_DIALOG_REASON } from "../../model/poem-management.constants";
import type { LeaveBlockedDialogProps, LeaveDialogReason } from "../LeaveBlockedDialog/LeaveBlockedDialog.types";

interface LeavePromptHost {
  /** Whether the failure alert shows now: one that appears while the dialog is open takes focus on close. */
  readonly hasFailure: boolean;
  readonly alertRef: RefObject<HTMLDivElement | null>;
}

/** The leave dialog's props, and the three callbacks `useLeaveGuard` takes. */
interface LeavePrompt {
  readonly dialog: LeaveBlockedDialogProps;
  /** The guard's `onBlocked`: opens the link form. */
  readonly openForLink: () => void;
  /** The guard's `askToLeave`: opens the sign-out form and answers once it closes. */
  readonly askToLeave: () => Promise<LeaveAnswer>;
  /** The guard's `closePrompt`: the page closes the dialog itself (saved, hidden, unmounted). */
  readonly closePrompt: () => void;
}

/**
 * Opens and closes the leave dialog and picks where focus goes after it (edit-poem design D10). The answer to a
 * sign-out question is given from the close handler, so any focus the asker sets runs after the native close.
 */
export function useLeavePrompt({ hasFailure, alertRef }: LeavePromptHost): LeavePrompt {
  const [reason, setReason] = useState<LeaveDialogReason>(LEAVE_DIALOG_REASON.link);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const stayRef = useRef<HTMLButtonElement>(null);
  // Where focus goes back after the link form: whatever had it when the link was clicked.
  const openerRef = useRef<Element | null>(null);
  const failureAtOpenRef = useRef(false);
  // What the close means; ×, Escape, and the backdrop leave it at `stay`.
  const answerRef = useRef<LeaveAnswer>(LEAVE_ANSWER.stay);
  const settleRef = useRef<((answer: LeaveAnswer) => void) | null>(null);
  // The element `open` showed. A hidden `Activity` detaches `dialogRef` before the guard's cleanup asks to close,
  // and a modal left open there would cover the next page.
  const shownDialogRef = useRef<HTMLDialogElement | null>(null);

  function settle(answer: LeaveAnswer) {
    settleRef.current?.(answer);
    settleRef.current = null;
  }

  function open(nextReason: LeaveDialogReason) {
    // The right form is in the DOM before the dialog opens and its button takes focus.
    flushSync(() => setReason(nextReason));
    answerRef.current = LEAVE_ANSWER.stay;
    failureAtOpenRef.current = hasFailure;
    const dialog = dialogRef.current;
    shownDialogRef.current = dialog;
    if (dialog !== null && !dialog.open) dialog.showModal();
    stayRef.current?.focus();
  }

  function openForLink() {
    openerRef.current = document.activeElement;
    open(LEAVE_DIALOG_REASON.link);
  }

  function askToLeave(): Promise<LeaveAnswer> {
    // One question at a time: a newer one settles the earlier, whose late answer the guard ignores (CR-01).
    settle(LEAVE_ANSWER.dismissed);
    return new Promise((resolve) => {
      settleRef.current = resolve;
      open(LEAVE_DIALOG_REASON.signOut);
    });
  }

  function closeWith(answer: LeaveAnswer) {
    answerRef.current = answer;
    shownDialogRef.current?.close();
  }

  function onClosed() {
    const answer = answerRef.current;
    if (answer !== LEAVE_ANSWER.stay) {
      // `leave`, or `dismissed`: the page closed the dialog itself and nothing here takes focus.
      settle(answer);
      return;
    }
    // A save that failed while the dialog was open: its alert takes focus, and the header's sign-out button leaves focus alone.
    if (!failureAtOpenRef.current && hasFailure) {
      alertRef.current?.focus();
      settle(LEAVE_ANSWER.dismissed);
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
      ref: dialogRef,
      stayRef,
      reason,
      onStay: () => closeWith(LEAVE_ANSWER.stay),
      onLeave: () => closeWith(LEAVE_ANSWER.leave),
      onClose: onClosed,
    },
    openForLink,
    askToLeave,
    closePrompt: () => {
      if (shownDialogRef.current?.open) closeWith(LEAVE_ANSWER.dismissed);
    },
  };
}

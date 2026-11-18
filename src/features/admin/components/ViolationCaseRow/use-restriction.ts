"use client";

import { useRef, useState } from "react";

import { callCaseAction } from "../../hooks/call-case-action";
import { CASE_FAILURE_MESSAGES } from "../../model/admin-messages";
import type { ModerationFailureReason } from "../../model/admin.types";
import { describeModerationSuccess } from "../../model/case-notices";
import type { EarlyBlockNote } from "../../model/early-block-note";

import { runBlockOrBan } from "./case-calls";
import type { RowShell } from "./use-row-shell";

type RestrictionDialog = "early-block" | "ban";

/**
 * A restriction that finds the user already restricted, or the account gone, has nothing left to do: the case is
 * closed, and the row says so. Both read as the case being over, in the row's own words.
 */
const CLOSING_RESTRICTION_FAILURES = {
  "already-restricted": CASE_FAILURE_MESSAGES["already-restricted"],
  "not-found": CASE_FAILURE_MESSAGES["case-not-found"],
} as const;

/**
 * Block and ban from a case row (FR-8): a block asks first when it comes before the deadline, a ban always asks. A
 * success or a closing failure closes the row; any other failure shows in the open dialog, and in the row once the
 * dialog is closed.
 */
export function useRestriction(shell: RowShell, userId: string, earlyNote: EarlyBlockNote | null) {
  const [openDialog, setOpenDialog] = useState<RestrictionDialog | null>(null);
  const earlyDialogRef = useRef<HTMLDialogElement>(null);
  const banDialogRef = useRef<HTMLDialogElement>(null);

  function show(dialog: RestrictionDialog) {
    shell.clearOutcome();
    setOpenDialog(dialog);
    const ref = dialog === "ban" ? banDialogRef : earlyDialogRef;
    ref.current?.showModal();
  }

  function applyFailure(reason: ModerationFailureReason) {
    if (reason === "already-restricted" || reason === "not-found") {
      shell.closeRow({ tone: "danger", text: CLOSING_RESTRICTION_FAILURES[reason] });
      return;
    }
    shell.setFailure(reason);
  }

  async function restrict(kind: "block" | "ban") {
    const answer = await callCaseAction(() => runBlockOrBan(kind, userId));
    if (!answer.ok) {
      applyFailure(answer.reason);
      return;
    }
    shell.closeRow(describeModerationSuccess(answer));
  }

  function requestBlock() {
    if (earlyNote !== null) {
      show("early-block");
      return;
    }
    shell.runCall(() => restrict("block"));
  }

  function confirmBlock() {
    shell.runCall(() => restrict("block"));
  }

  function requestBan() {
    show("ban");
  }

  function confirmBan() {
    shell.runCall(() => restrict("ban"));
  }

  function handleDialogClose() {
    setOpenDialog(null);
  }

  return {
    earlyDialogRef,
    banDialogRef,
    // While a dialog is open its failure shows there; closed, the row shows it.
    ownFailure: openDialog === null ? shell.failure : null,
    dialogFailure: openDialog === null ? null : shell.failure,
    requestBlock,
    confirmBlock,
    requestBan,
    confirmBan,
    handleDialogClose,
  };
}

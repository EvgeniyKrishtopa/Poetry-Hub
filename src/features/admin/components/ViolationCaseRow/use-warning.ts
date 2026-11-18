"use client";

import { useRef } from "react";

import { CASE_FAILURE_MESSAGES, CASE_RESULT_MESSAGES } from "../../model/admin-messages";
import type { AdminNotice } from "../../model/violation.types";
import type { WarnSettleReason, WarnSettlement } from "../WarnDialog/WarnDialog.types";

import type { RowShell } from "./use-row-shell";

const WARN_STOP_NOTICES = {
  "already-warned": { tone: "neutral", text: CASE_RESULT_MESSAGES.alreadyWarned },
  "wrong-ground": { tone: "danger", text: CASE_RESULT_MESSAGES.wrongGround },
  "case-not-found": { tone: "danger", text: CASE_FAILURE_MESSAGES["case-not-found"] },
  "already-restricted": { tone: "danger", text: CASE_FAILURE_MESSAGES["already-restricted"] },
} as const satisfies Record<WarnSettleReason, AdminNotice>;

/** A warning stopped by a case that is over (removed, or its user restricted) closes the row; the others refresh it. */
const CLOSING_WARN_STOPS: readonly WarnSettleReason[] = ["case-not-found", "already-restricted"];

/** The warning dialog's opening and how it ended; the dialog itself runs the send (FR-6, FR-11). */
export function useWarning(shell: RowShell) {
  const warnDialogRef = useRef<HTMLDialogElement>(null);

  function openWarnDialog() {
    shell.clearOutcome();
    warnDialogRef.current?.showModal();
  }

  function handleWarned(settlement: WarnSettlement) {
    if (settlement.kind === "sent") {
      shell.setNotice({ tone: "success", text: CASE_RESULT_MESSAGES.warned });
      shell.refreshList();
      return;
    }
    const stop = WARN_STOP_NOTICES[settlement.reason];
    if (CLOSING_WARN_STOPS.includes(settlement.reason)) {
      shell.closeRow(stop);
      return;
    }
    shell.setNotice(stop);
    shell.refreshList();
  }

  return { warnDialogRef, openWarnDialog, handleWarned };
}

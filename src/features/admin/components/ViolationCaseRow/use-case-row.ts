"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type RefObject } from "react";

import { useConnection } from "@/shared/lib/network/use-connection";

import { callCaseAction } from "../../hooks/call-case-action";
import { CASE_FAILURE_MESSAGES, CASE_RESULT_MESSAGES } from "../../model/admin-messages";
import type { ModerationFailureReason } from "../../model/admin.types";
import { caseFailureMessage, describeModerationSuccess } from "../../model/case-notices";
import type { EarlyBlockNote } from "../../model/early-block-note";
import { otherGround } from "../../model/other-ground";
import type { AdminNotice, CaseFailureReason, ViolationCase } from "../../model/violation.types";
import type { WarnSettleReason, WarnSettlement } from "../WarnDialog/WarnDialog.types";

import { runBlockOrBan, runRemoveCase, runSetGround } from "./case-calls";

type DialogKind = "warn" | "early-block" | "ban";

/**
 * A restriction that finds the user already restricted, or the account gone, has nothing left to do: the case is
 * closed, and the row says so. Both read as the case being over, in the row's own words.
 */
const CLOSING_RESTRICTION_FAILURES = {
  "already-restricted": CASE_FAILURE_MESSAGES["already-restricted"],
  "not-found": CASE_FAILURE_MESSAGES["case-not-found"],
} as const;

const WARN_STOP_NOTICES = {
  "already-warned": { tone: "neutral", text: CASE_RESULT_MESSAGES.alreadyWarned },
  "wrong-ground": { tone: "danger", text: CASE_RESULT_MESSAGES.wrongGround },
  "case-not-found": { tone: "danger", text: CASE_FAILURE_MESSAGES["case-not-found"] },
  "already-restricted": { tone: "danger", text: CASE_FAILURE_MESSAGES["already-restricted"] },
} as const satisfies Record<WarnSettleReason, AdminNotice>;

/** A warning stopped by a case that is over (removed, or its user restricted) closes the row; the others refresh it. */
const CLOSING_WARN_STOPS: readonly string[] = ["case-not-found", "already-restricted"];

/**
 * The state and calls of one case row: which dialog is open, the line under the buttons, and the outcome of each
 * action (design D6, D7, FR-7, FR-8, FR-15). A ground switch, a warning and a stale answer refresh the list. A
 * block, a ban or a case that is gone does not: the case is closed, so the row keeps its message and loses its
 * buttons, and leaves the list the next time the page loads.
 */
export function useCaseRow(violationCase: ViolationCase, earlyNote: EarlyBlockNote | null) {
  const router = useRouter();
  const { isOnline } = useConnection();
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<AdminNotice | null>(null);
  // A block or ban failure that leaves the row open: shown in the dialog while it is open, in the row after.
  const [restrictionFailure, setRestrictionFailure] = useState<ModerationFailureReason | null>(null);
  const [isClosed, setIsClosed] = useState(false);
  const [openDialog, setOpenDialog] = useState<DialogKind | null>(null);
  const warnDialogRef = useRef<HTMLDialogElement>(null);
  const earlyDialogRef = useRef<HTMLDialogElement>(null);
  const banDialogRef = useRef<HTMLDialogElement>(null);
  // Set synchronously: a second click can arrive before the pending state disables the buttons.
  const sendingRef = useRef(false);

  const dialogRefs: Record<DialogKind, RefObject<HTMLDialogElement | null>> = {
    warn: warnDialogRef,
    "early-block": earlyDialogRef,
    ban: banDialogRef,
  };

  function show(dialog: DialogKind) {
    setNotice(null);
    setRestrictionFailure(null);
    setOpenDialog(dialog);
    dialogRefs[dialog].current?.showModal();
  }

  function refreshList() {
    startTransition(() => {
      router.refresh();
    });
  }

  // One call at a time: the transition stays pending until the call, and a refresh it asked for, have ended.
  function runCall(call: () => Promise<void>) {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setNotice(null);
    setRestrictionFailure(null);
    startTransition(async () => {
      await call();
      sendingRef.current = false;
    });
  }

  function showCaseFailure(reason: CaseFailureReason) {
    setNotice({ tone: "danger", text: caseFailureMessage(reason, null) });
    if (reason === "case-not-found") setIsClosed(true);
  }

  function applyRestrictionFailure(reason: ModerationFailureReason) {
    if (reason === "already-restricted" || reason === "not-found") {
      setNotice({ tone: "danger", text: CLOSING_RESTRICTION_FAILURES[reason] });
      setIsClosed(true);
      return;
    }
    setRestrictionFailure(reason);
  }

  async function restrict(kind: "block" | "ban") {
    const answer = await callCaseAction(() => runBlockOrBan(kind, violationCase.userId));
    if (!answer.ok) {
      applyRestrictionFailure(answer.reason);
      return;
    }
    setNotice(describeModerationSuccess(answer));
    setIsClosed(true);
  }

  function switchGround() {
    runCall(async () => {
      const answer = await callCaseAction(() => runSetGround(violationCase.id, otherGround(violationCase.ground)));
      if (!answer.ok) {
        showCaseFailure(answer.reason);
        return;
      }
      setNotice({ tone: "success", text: CASE_RESULT_MESSAGES.groundChanged });
      refreshList();
    });
  }

  function remove() {
    runCall(async () => {
      const answer = await callCaseAction(() => runRemoveCase(violationCase.id));
      if (!answer.ok) {
        showCaseFailure(answer.reason);
        return;
      }
      refreshList();
    });
  }

  function requestBlock() {
    if (earlyNote !== null) {
      show("early-block");
      return;
    }
    runCall(() => restrict("block"));
  }

  function confirmBlock() {
    runCall(() => restrict("block"));
  }

  function requestBan() {
    show("ban");
  }

  function confirmBan() {
    runCall(() => restrict("ban"));
  }

  function openWarnDialog() {
    show("warn");
  }

  function handleWarned(settlement: WarnSettlement) {
    if (settlement.kind === "sent") {
      setNotice({ tone: "success", text: CASE_RESULT_MESSAGES.warned });
      refreshList();
      return;
    }
    setNotice(WARN_STOP_NOTICES[settlement.reason]);
    if (CLOSING_WARN_STOPS.includes(settlement.reason)) setIsClosed(true);
    else refreshList();
  }

  function handleDialogClose() {
    setOpenDialog(null);
  }

  return {
    notice,
    isClosed,
    isPending,
    isOnline,
    openDialog,
    dialogRefs,
    // While a dialog is open its failure shows there; closed, the row shows it.
    ownFailure: openDialog === null ? restrictionFailure : null,
    dialogFailure: openDialog === null ? null : restrictionFailure,
    openWarnDialog,
    switchGround,
    remove,
    requestBlock,
    confirmBlock,
    requestBan,
    confirmBan,
    handleWarned,
    handleDialogClose,
  };
}

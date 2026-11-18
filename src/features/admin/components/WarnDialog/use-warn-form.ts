"use client";

import { useEffect, useRef, useState, useTransition, type ChangeEvent } from "react";

import { useConnection } from "@/shared/lib/network/use-connection";

import { sendWarningAction } from "../../actions/send-warning.actions";
import { callCaseAction } from "../../hooks/call-case-action";
import type { AdminNotice, SendWarningActionResult } from "../../model/violation.types";
import { checkWarningMessage, type WarningMessageError } from "../../model/warning-message-check";

import { classifyWarning, type WarnOutcome } from "./classify-warning";
import type { WarnDialogProps, WarnSettlement } from "./WarnDialog.types";

async function runSend(caseId: string, message: string): Promise<SendWarningActionResult | undefined> {
  const response = await sendWarningAction({ caseId, message });
  return response.data;
}

/**
 * The warning dialog's state: the message, its field error, the notice above the buttons, the read-only lock after a
 * send whose outcome is unknown, and how the dialog ends. All of it lives in the open dialog and is dropped when it
 * closes, so reopening gives an empty, editable field (FR-11).
 */
export function useWarnForm({ dialogRef, caseId, onSettled, onClose }: WarnDialogProps) {
  const { status: connectionStatus, isOnline } = useConnection();
  const [message, setMessage] = useState("");
  const [fieldError, setFieldError] = useState<WarningMessageError | null>(null);
  const [notice, setNotice] = useState<AdminNotice | null>(null);
  const [locked, setLocked] = useState(false);
  const [settlement, setSettlement] = useState<WarnSettlement | null>(null);
  const [isPending, startTransition] = useTransition();
  // Set synchronously: a second click can arrive before the pending state disables the button.
  const sendingRef = useRef(false);

  // A finished dialog closes once the request has ended, as the ban dialog does.
  useEffect(() => {
    if (settlement !== null && !isPending && dialogRef.current?.open) dialogRef.current.close();
  }, [settlement, isPending, dialogRef]);

  function applyOutcome(outcome: WarnOutcome) {
    if (outcome.kind === "sent") {
      setSettlement({ kind: "sent" });
      return;
    }
    if (outcome.kind === "stopped") {
      setSettlement({ kind: "stopped", reason: outcome.reason });
      return;
    }
    setNotice(outcome.notice);
    if (outcome.locksMessage) setLocked(true);
  }

  function submit() {
    if (sendingRef.current) return;
    const check = checkWarningMessage(message);
    if (!check.ok) {
      setFieldError(check.error);
      return;
    }
    sendingRef.current = true;
    setFieldError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        const answer = await callCaseAction(() => runSend(caseId, message));
        applyOutcome(classifyWarning(answer));
      } finally {
        sendingRef.current = false;
      }
    });
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setMessage(event.target.value);
    setFieldError(null);
  }

  function handleClose() {
    const finished = settlement;
    setMessage("");
    setFieldError(null);
    setNotice(null);
    setLocked(false);
    setSettlement(null);
    if (finished !== null) onSettled(finished);
    onClose();
  }

  return {
    message,
    fieldError,
    notice,
    locked,
    isPending,
    connectionStatus,
    isOnline,
    handleChange,
    submit,
    handleClose,
  };
}

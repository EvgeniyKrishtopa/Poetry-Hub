"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { useConnection } from "@/shared/lib/network/use-connection";

import type { ModerationFailureReason } from "../../model/admin.types";
import { caseFailureMessage } from "../../model/case-notices";
import type { AdminNotice, CaseFailureReason } from "../../model/violation.types";

/**
 * What every action of a case row shares: the line under the buttons, the failure a dialog may show, whether the case
 * is over, and the rule that only one call runs at a time. The per-action hooks take it as their argument, so none of
 * them owns state another one reads.
 */
export function useRowShell() {
  const router = useRouter();
  const { isOnline } = useConnection();
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<AdminNotice | null>(null);
  // A block or ban failure that leaves the row open: shown in the dialog while it is open, in the row after.
  const [failure, setFailure] = useState<ModerationFailureReason | null>(null);
  const [isClosed, setIsClosed] = useState(false);
  // Set synchronously: a second click can arrive before the pending state disables the buttons.
  const sendingRef = useRef(false);

  function clearOutcome() {
    setNotice(null);
    setFailure(null);
  }

  function refreshList() {
    startTransition(() => {
      router.refresh();
    });
  }

  /** The case is over: the row keeps this line and loses its buttons, and the page is not refreshed (design D7). */
  function closeRow(next: AdminNotice) {
    setNotice(next);
    setIsClosed(true);
  }

  /** A failed case action: its line, and a closed row when the case is gone. */
  function failCase(reason: CaseFailureReason) {
    const next: AdminNotice = { tone: "danger", text: caseFailureMessage(reason, null) };
    if (reason === "case-not-found") closeRow(next);
    else setNotice(next);
  }

  // One call at a time: the transition stays pending until the call, and a refresh it asked for, have ended.
  function runCall(call: () => Promise<void>) {
    if (sendingRef.current) return;
    sendingRef.current = true;
    clearOutcome();
    startTransition(async () => {
      try {
        await call();
      } finally {
        sendingRef.current = false;
      }
    });
  }

  return { notice, setNotice, failure, setFailure, isClosed, isPending, isOnline, clearOutcome, refreshList, closeRow, failCase, runCall };
}

export type RowShell = ReturnType<typeof useRowShell>;

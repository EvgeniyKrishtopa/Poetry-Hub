"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";

import { useConnection } from "@/shared/lib/network/use-connection";

import { moveHomeEntryAction } from "../actions/move-home-entry.actions";
import { removeHomeEntryAction } from "../actions/remove-home-entry.actions";
import { describeHomeListResult } from "../model/home-entry-notices";
import type { HomeActionResult, HomeEntry, HomeEntryKind, HomeMoveStatus, HomeRemoveStatus } from "../model/home-entry.types";
import { type HomeEntryMove, reorderHomeEntries } from "../model/reorder-home-entries";
import type { AdminNotice } from "../model/violation.types";

import { callCaseAction } from "./call-case-action";

type HomeListAnswer = HomeActionResult<HomeMoveStatus | HomeRemoveStatus>;

interface UseHomeEntryList {
  /** The dropped order while a move sends, the stored one otherwise. */
  readonly entries: readonly HomeEntry[];
  /** True while a call is out or the connection is not normal: a handle or a button must not start another one. */
  readonly controlsDisabled: boolean;
  readonly isPending: boolean;
  readonly notice: AdminNotice | null;
  readonly isOnline: boolean;
  readonly move: (entry: HomeEntry, toPosition: number) => void;
  readonly remove: (entry: HomeEntry) => void;
}

/**
 * One list's writes (FR-9): a drop shows its new order at once through `useOptimistic`; when the transition ends React
 * shows the props again, which the action already refreshed on a stored or stale move and left unchanged on a failed
 * one, so a refused entry returns by itself. One call is out at a time.
 */
export function useHomeEntryList(kind: HomeEntryKind, entries: readonly HomeEntry[]): UseHomeEntryList {
  const { isOnline } = useConnection();
  const [shown, applyOptimistic] = useOptimistic(entries, reorderHomeEntries);
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<AdminNotice | null>(null);
  // Set synchronously: a second drop can arrive before the pending state disables the handles.
  const sendingRef = useRef(false);

  // State set after an `await` leaves the transition, so the notice is set in a transition of its own.
  function send(optimisticMove: HomeEntryMove | null, run: () => Promise<HomeListAnswer | undefined>) {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setNotice(null);
    startTransition(async () => {
      try {
        if (optimisticMove !== null) applyOptimistic(optimisticMove);
        const answer = await callCaseAction(run);
        const answerNotice = describeHomeListResult(answer);
        startTransition(() => setNotice(answerNotice));
      } finally {
        // Always released: a step that threw must not leave every later drop and remove ignored.
        sendingRef.current = false;
      }
    });
  }

  function move(entry: HomeEntry, toPosition: number) {
    if (toPosition === entry.position) return;
    const optimisticMove: HomeEntryMove = { id: entry.id, toPosition };
    send(optimisticMove, async () => {
      const response = await moveHomeEntryAction({
        kind,
        id: entry.id,
        fromPosition: entry.position,
        toPosition,
      });
      return response.data;
    });
  }

  function remove(entry: HomeEntry) {
    send(null, async () => {
      const response = await removeHomeEntryAction({ kind, id: entry.id });
      return response.data;
    });
  }

  return { entries: shown, controlsDisabled: isPending || !isOnline, isPending, notice, isOnline, move, remove };
}

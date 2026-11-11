"use client";

import { useRouter } from "next/navigation";
import { type RefObject, useEffect, useOptimistic, useRef, useState, useTransition } from "react";

import { SIGN_IN_PATH } from "@/shared/config/account-paths";
import { useSessionExpiredNotice } from "@/shared/lib/one-time-notice/session-expired-notice.store";

import { moveCollectionAction } from "../../actions/move-collection.actions";
import { movePoemAction } from "../../actions/move-poem.actions";
import { arrangeDrop } from "../../model/arrange-drop";
import { MOVE_FAILURE_REASON } from "../../model/work-ordering.constants";
import type { Arrangement, Drop, MoveResult } from "../../model/work-ordering.types";

/** A new object per failure, so the same failure twice moves focus to the alert twice. */
export interface MoveAlert {
  readonly reason: typeof MOVE_FAILURE_REASON.failed | typeof MOVE_FAILURE_REASON.rateLimited | typeof MOVE_FAILURE_REASON.stale;
}

interface UseMoveSubmit {
  /** The dropped place while the move is sending, the stored arrangement otherwise (design D4). */
  readonly arrangement: Arrangement;
  readonly isPending: boolean;
  /** The last drop the server stored, a new object each time: the board puts focus back on its handle (FR-7). */
  readonly stored: Drop | null;
  readonly alert: MoveAlert | null;
  readonly alertRef: RefObject<HTMLDivElement | null>;
  readonly submit: (drop: Drop) => void;
}

const FAILED: MoveResult = { ok: false, reason: MOVE_FAILURE_REASON.failed };

async function send(drop: Drop): Promise<MoveResult> {
  try {
    const answer =
      drop.kind === "poem"
        ? await movePoemAction({ poemId: drop.poemId, from: drop.from, to: drop.to, toIndex: drop.toIndex })
        : await moveCollectionAction({ collectionId: drop.collectionId, toIndex: drop.toIndex });
    // No data at all: a rejected input or a server error the action client already logged and masked.
    return answer.data ?? FAILED;
  } catch (error) {
    // A thrown call (network drop) is a failed move, never the page's error screen. The error's type only (NFR-7).
    console.error(`[work-ordering] move call rejected: ${error instanceof Error ? error.name : typeof error}`);
    return FAILED;
  }
}

/**
 * The transition, the action call and its answer (design D4): the dropped place shows at once through
 * `useOptimistic`; when the transition ends React shows the props again, which a stored or stale move already
 * refreshed and a refused one left unchanged, so the item returns by itself (FR-6). One move is in flight at a time.
 */
export function useMoveSubmit(arrangement: Arrangement): UseMoveSubmit {
  const router = useRouter();
  const [optimistic, applyOptimistic] = useOptimistic(arrangement, arrangeDrop);
  const [isPending, startTransition] = useTransition();
  const [alert, setAlert] = useState<MoveAlert | null>(null);
  const [stored, setStored] = useState<Drop | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  // Set synchronously: a second drop can arrive before the pending state disables the handles.
  const sendingRef = useRef(false);

  useEffect(() => {
    if (alert !== null) alertRef.current?.focus();
  }, [alert]);

  // State set after an `await` leaves the transition, so each outcome sets its own in a transition (state-management).
  function settle(drop: Drop, result: MoveResult) {
    if (result.ok) {
      setStored(drop);
      return;
    }
    if (result.reason === MOVE_FAILURE_REASON.unauthenticated) {
      useSessionExpiredNotice.getState().markSessionExpired();
      router.replace(SIGN_IN_PATH);
      // The header still shows the signed-in links until the server renders it again.
      router.refresh();
      return;
    }
    setAlert({ reason: result.reason });
  }

  function submit(drop: Drop) {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setAlert(null);
    startTransition(async () => {
      applyOptimistic(drop);
      const result = await send(drop);
      startTransition(() => settle(drop, result));
      sendingRef.current = false;
    });
  }

  return { arrangement: optimistic, isPending, stored, alert, alertRef, submit };
}

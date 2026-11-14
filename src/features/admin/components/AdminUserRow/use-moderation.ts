"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import { banUserAction } from "../../actions/ban-user.actions";
import { blockUserAction } from "../../actions/block-user.actions";
import { revokeSessionsAction } from "../../actions/revoke-sessions.actions";
import { unblockUserAction } from "../../actions/unblock-user.actions";
import type { ModerationActionKind, ModerationActionResult } from "../../model/admin.types";

const ACTIONS = {
  block: blockUserAction,
  unblock: unblockUserAction,
  revoke: revokeSessionsAction,
  ban: banUserAction,
} as const satisfies Record<
  ModerationActionKind,
  (input: { userId: string }) => Promise<{ data?: ModerationActionResult }>
>;

/** A server answer that never arrived (a thrown error, a rejected input) reads as an outage: nothing changed. */
const NO_ANSWER: ModerationActionResult = { ok: false, reason: "unavailable" };

/**
 * Runs one moderation action for a row and keeps its last outcome. A success refreshes the route, so the list
 * re-renders with fresh data (FR-3); the transition stays pending until then. One call at a time per row.
 */
export function useModeration(userId: string) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [outcome, setOutcome] = useState<ModerationActionResult | null>(null);
  // Set synchronously: a second click can arrive before the pending state disables the buttons.
  const sendingRef = useRef(false);

  function run(kind: ModerationActionKind) {
    if (sendingRef.current) return;
    sendingRef.current = true;
    setOutcome(null);
    startTransition(async () => {
      let result: ModerationActionResult;
      try {
        result = (await ACTIONS[kind]({ userId })).data ?? NO_ANSWER;
      } catch {
        result = NO_ANSWER;
      } finally {
        sendingRef.current = false;
      }
      setOutcome(result);
      if (result.ok) router.refresh();
    });
  }

  return { run, isPending, outcome, clearOutcome: () => setOutcome(null) };
}

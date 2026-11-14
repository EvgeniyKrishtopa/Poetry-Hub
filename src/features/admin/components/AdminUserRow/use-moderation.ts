"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";

import type { ModerationActionKind, ModerationActionResult } from "../../model/admin.types";

import { callModeration } from "./call-moderation";

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
      const result = await callModeration(kind, userId);
      sendingRef.current = false;
      setOutcome(result);
      if (result.ok) router.refresh();
    });
  }

  function clearOutcome() {
    setOutcome(null);
  }

  return { run, isPending, outcome, clearOutcome };
}

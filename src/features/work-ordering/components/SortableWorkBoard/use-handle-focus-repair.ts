"use client";

import { useEffect, useRef } from "react";

import type { Drop } from "../../model/work-ordering.types";

const HANDLE_ATTRIBUTE = "data-handle";

interface UseHandleFocusRepairOptions {
  /** True while a handle must not take focus: a natively disabled one can't. */
  readonly handlesDisabled: boolean;
  /** The last drop the server stored, a new object each time: its handle takes focus back (FR-7). */
  readonly stored: Drop | null;
}

interface UseHandleFocusRepair {
  /** Asks for focus on the handle of `itemId` as soon as it exists and is enabled. */
  readonly queueHandleFocus: (itemId: string) => void;
}

/**
 * Puts focus back on the handle of the item that was moved. A handle that moved between lists remounts and a disabled
 * one can't take focus, so the repair runs after a render in which the handle exists and is enabled; the library's own
 * `restoreFocus` is off for that reason. A stored drop queues its handle too; a refused one leaves focus on its alert
 * (FR-6, FR-11).
 */
export function useHandleFocusRepair({ handlesDisabled, stored }: UseHandleFocusRepairOptions): UseHandleFocusRepair {
  const pendingItemIdRef = useRef<string | null>(null);

  function queueHandleFocus(itemId: string) {
    pendingItemIdRef.current = itemId;
  }

  useEffect(() => {
    if (stored !== null) pendingItemIdRef.current = stored.kind === "poem" ? stored.poemId : stored.collectionId;
  }, [stored]);

  useEffect(() => {
    const itemId = pendingItemIdRef.current;
    if (itemId === null || handlesDisabled) return;
    const handle = document.querySelector<HTMLElement>(`[${HANDLE_ATTRIBUTE}="${CSS.escape(itemId)}"]`);
    if (handle === null) return;
    handle.focus();
    pendingItemIdRef.current = null;
  });

  return { queueHandleFocus };
}

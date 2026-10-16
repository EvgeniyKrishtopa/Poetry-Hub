"use client";

import { useOptimistic, useState } from "react";

import { SAVED_MESSAGE } from "../model/author-messages";

/**
 * The save notice's text (FR-7, NFR-5): emptied while an action is pending and set when it settles,
 * so every successful save changes the live region's text and is announced again (design D6).
 */
export function useSaveNotice() {
  const [notice, setNotice] = useState("");
  // A plain update inside the action would be held back until it settles, so the clear is optimistic.
  const [shownNotice, setShownNotice] = useOptimistic(notice);

  return {
    shownNotice,
    /** Call inside the action. */
    clear: () => setShownNotice(""),
    settle: (saved: boolean) => setNotice(saved ? SAVED_MESSAGE : ""),
  };
}

"use client";

import { useEffect, useRef, useState } from "react";

import { Alert } from "@/shared/ui";

import { useCreatedPoemNotice } from "../../model/created-poem-notice-ui.store";
import { POEM_MANAGEMENT_COPY } from "../../model/poem-management-messages";

import type { CreatedPoemNoticeProps } from "./CreatedPoemNotice.types";

/**
 * The success notification, shown once for the poem just created (design D8). It renders from a snapshot
 * taken on the first render, not from a live selector, so clearing the store doesn't hide it.
 */
export function CreatedPoemNotice({ poemId }: CreatedPoemNoticeProps) {
  const [shownId] = useState(() => useCreatedPoemNotice.getState().createdPoemId);
  const [dismissed, setDismissed] = useState(false);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    // Strict Mode's dev re-run follows its cleanup at once, so it cancels the dismissal and the notice
    // stays on first show. A page Next hides for Back/Forward (React `Activity`) runs only the cleanup, so
    // the dismissal lands while hidden, and the notice is gone when the page shows again.
    clearTimeout(dismissTimer.current);
    useCreatedPoemNotice.getState().clearCreatedPoemId();
    return () => {
      // Left running on a real unmount on purpose: React ignores a state update there, and this cleanup
      // can't tell an unmount from an `Activity` hide.
      dismissTimer.current = setTimeout(() => setDismissed(true));
    };
  }, []);

  if (dismissed || shownId !== poemId) return null;
  return <Alert tone="success">{POEM_MANAGEMENT_COPY.created}</Alert>;
}

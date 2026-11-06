"use client";

import { useOneTimeValue } from "@/shared/lib/one-time-notice/use-one-time-value";
import { Alert } from "@/shared/ui";

import { COLLECTION_PAGE_COPY } from "../../model/collection-management-messages";
import type { SavedCollectionNotice as SavedCollectionNoticeValue } from "../../model/collection-management.types";
import { useSavedCollectionNotice } from "../../model/saved-collection-notice-ui.store";

import type { SavedCollectionNoticeProps } from "./SavedCollectionNotice.types";

// Module-level, so `useOneTimeValue` gets stable functions.
function readSavedNotice(): SavedCollectionNoticeValue | null {
  return useSavedCollectionNotice.getState().notice;
}

function clearSavedNotice(): void {
  useSavedCollectionNotice.getState().clearSavedNotice();
}

/** The saved notice (`COLLECTION_PAGE_COPY.saved`), once, on the collection just saved (design D8). */
export function SavedCollectionNotice({ collectionId }: SavedCollectionNoticeProps) {
  const notice = useOneTimeValue(readSavedNotice, clearSavedNotice);

  if (notice?.collectionId !== collectionId) return null;
  return <Alert tone="success">{COLLECTION_PAGE_COPY.saved}</Alert>;
}

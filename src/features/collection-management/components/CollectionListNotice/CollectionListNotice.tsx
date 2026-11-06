"use client";

import { useOneTimeValue } from "@/shared/lib/one-time-notice/use-one-time-value";
import { Alert } from "@/shared/ui";

import { useCollectionListNotice } from "../../model/collection-list-notice-ui.store";
import { COLLECTION_LIST_COPY } from "../../model/collection-management-messages";
import type { CollectionListNotice as CollectionListNoticeValue } from "../../model/collection-management.types";

// Module-level, so `useOneTimeValue` gets stable functions.
function readListNotice(): CollectionListNoticeValue | null {
  return useCollectionListNotice.getState().notice;
}

function clearListNotice(): void {
  useCollectionListNotice.getState().clearListNotice();
}

/** The one-time notice on `/account/poems` after a create or a delete (design D8). */
export function CollectionListNotice() {
  const notice = useOneTimeValue(readListNotice, clearListNotice);

  if (notice === null) return null;
  if (notice.kind === "already-deleted") return <Alert tone="neutral">{COLLECTION_LIST_COPY.alreadyDeleted}</Alert>;
  const text = notice.kind === "created" ? COLLECTION_LIST_COPY.created(notice.title) : COLLECTION_LIST_COPY.deleted(notice.title);
  return <Alert tone="success">{text}</Alert>;
}

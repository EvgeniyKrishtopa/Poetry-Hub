"use client";

import { useOneTimeValue } from "@/shared/lib/one-time-notice/use-one-time-value";
import { Alert } from "@/shared/ui";

import { useDeletedPoemNotice } from "../../model/deleted-poem-notice-ui.store";
import { DELETE_POEM_COPY } from "../../model/poem-management-messages";
import type { DeletedPoemNotice as DeletedPoemNoticeValue } from "../../model/poem-management.types";

function readDeletedNotice(): DeletedPoemNoticeValue | null {
  return useDeletedPoemNotice.getState().notice;
}

function clearDeletedNotice(): void {
  useDeletedPoemNotice.getState().clearDeletedNotice();
}

/** The one-time deleted / already-deleted notice on `/account/poems` (design D5). */
export function DeletedPoemNotice() {
  const notice = useOneTimeValue(readDeletedNotice, clearDeletedNotice);

  if (notice === null) return null;
  const text = notice.kind === "deleted" ? DELETE_POEM_COPY.deleted(notice.title) : DELETE_POEM_COPY.alreadyDeleted;
  return <Alert tone="success">{text}</Alert>;
}

"use client";

import { useOneTimeValue } from "@/shared/lib/one-time-notice/use-one-time-value";
import { Alert } from "@/shared/ui";

import { useCreatedPoemNotice } from "../../model/created-poem-notice-ui.store";
import { EDIT_POEM_COPY, POEM_MANAGEMENT_COPY } from "../../model/poem-management-messages";
import type { PoemNotice } from "../../model/poem-management.types";

import type { CreatedPoemNoticeProps } from "./CreatedPoemNotice.types";

const NOTICE_TEXTS: Readonly<Record<PoemNotice["kind"], string>> = {
  created: POEM_MANAGEMENT_COPY.created,
  saved: EDIT_POEM_COPY.saved,
};

function readPoemNotice(): PoemNotice | null {
  return useCreatedPoemNotice.getState().notice;
}

function clearPoemNotice(): void {
  useCreatedPoemNotice.getState().clearPoemNotice();
}

/** The success notification, shown once for the poem just created or saved (add-poem-creation D8, edit-poem D7). */
export function CreatedPoemNotice({ poemId }: CreatedPoemNoticeProps) {
  const notice = useOneTimeValue(readPoemNotice, clearPoemNotice);

  if (notice?.poemId !== poemId) return null;
  return <Alert tone="success">{NOTICE_TEXTS[notice.kind]}</Alert>;
}

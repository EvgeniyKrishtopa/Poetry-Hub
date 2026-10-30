"use client";

import { useOneTimeValue } from "@/shared/lib/one-time-notice/use-one-time-value";
import { Alert } from "@/shared/ui";

import { useCreatedPoemNotice } from "../../model/created-poem-notice-ui.store";
import { POEM_MANAGEMENT_COPY } from "../../model/poem-management-messages";

import type { CreatedPoemNoticeProps } from "./CreatedPoemNotice.types";

function readCreatedPoemId(): string | null {
  return useCreatedPoemNotice.getState().createdPoemId;
}

function clearCreatedPoemId(): void {
  useCreatedPoemNotice.getState().clearCreatedPoemId();
}

/** The success notification, shown once for the poem just created (add-poem-creation design D8). */
export function CreatedPoemNotice({ poemId }: CreatedPoemNoticeProps) {
  const shownId = useOneTimeValue(readCreatedPoemId, clearCreatedPoemId);

  if (shownId !== poemId) return null;
  return <Alert tone="success">{POEM_MANAGEMENT_COPY.created}</Alert>;
}

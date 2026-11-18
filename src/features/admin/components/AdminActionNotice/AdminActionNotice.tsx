"use client";

import { useOneTimeValue } from "@/shared/lib/one-time-notice/use-one-time-value";
import { Alert } from "@/shared/ui";

import { describeFailedDeleteNotice } from "../../model/case-notices";
import type { FailedNoticeValue } from "../../model/violation.types";
import { useViolationNotice } from "../../model/violation-notice-ui.store";

function readFailedNotice(): FailedNoticeValue | null {
  return useViolationNotice.getState().notice;
}

function clearFailedNotice(): void {
  useViolationNotice.getState().clearFailedNotice();
}

/**
 * The one-time line on the author page that says the email after an admin delete was not sent (FR-14). The store
 * is written only by the admin delete control, so a reader who deleted nothing never has a value to show, and no
 * request is made here: the page stays as cached as before (NFR-4).
 */
export function AdminActionNotice() {
  const notice = useOneTimeValue(readFailedNotice, clearFailedNotice);

  if (notice === null) return null;
  return <Alert tone="neutral">{describeFailedDeleteNotice(notice)}</Alert>;
}

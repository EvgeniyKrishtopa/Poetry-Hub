"use client";

import { useOneTimeValue } from "@/shared/lib/one-time-notice/use-one-time-value";
import { useSessionExpiredNotice } from "@/shared/lib/one-time-notice/session-expired-notice.store";
import { Alert } from "@/shared/ui";

import { SESSION_EXPIRED_NOTICE } from "../../model/auth-messages";

// `true` or nothing: the hook treats `null` as "no value", and a `false` flag means there is none.
function readSessionExpired(): true | null {
  return useSessionExpiredNotice.getState().expired ? true : null;
}

function clearSessionExpired(): void {
  useSessionExpiredNotice.getState().clearSessionExpired();
}

/** The one-time session-expired notice on `/login` (delete-poem design D6). */
export function SessionExpiredNotice() {
  const expired = useOneTimeValue(readSessionExpired, clearSessionExpired);

  if (expired === null) return null;
  return <Alert tone="neutral">{SESSION_EXPIRED_NOTICE}</Alert>;
}

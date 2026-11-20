import { trimmedLength } from "@/shared/lib/text/trimmed-length";

import { WARNING_MESSAGE_MAX_LENGTH } from "./violation.constants";

export type WarningMessageError = "empty" | "too-long";

export type WarningMessageCheck =
  { readonly ok: true } | { readonly ok: false; readonly error: WarningMessageError };

/** The browser's own check of the message before the action is called; the action's schema repeats it (FR-6). */
export function checkWarningMessage(message: string): WarningMessageCheck {
  const length = trimmedLength(message);
  if (length === 0) return { ok: false, error: "empty" };
  if (length > WARNING_MESSAGE_MAX_LENGTH) return { ok: false, error: "too-long" };
  return { ok: true };
}

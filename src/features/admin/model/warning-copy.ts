import type { NoticeEmailContent } from "./violation.types";

/** The warning email: a fixed subject, the admin's message, then a fixed reason and one-day block (design D4). */
export function buildWarningEmail(adminMessage: string): NoticeEmailContent {
  void adminMessage;
  throw new Error("not implemented");
}

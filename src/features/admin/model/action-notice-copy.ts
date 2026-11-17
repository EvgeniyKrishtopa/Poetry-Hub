import type { ActionNoticeContent, NoticeEmailContent } from "./violation.types";

/**
 * The standard email after a restricting action: a fixed subject per kind with no user text, and a body with the
 * reason from the ground or a general one. A title is plain text in the body only (design D5).
 */
export function buildActionNoticeEmail(content: ActionNoticeContent): NoticeEmailContent {
  void content;
  throw new Error("not implemented");
}

import { GROUND_REASON_TEXT, WARNING_TEXT } from "./email-copy.constants";
import { VIOLATION_GROUND } from "./violation.constants";
import type { NoticeEmailContent } from "./violation.types";

const WARNING_FRAME = `${WARNING_TEXT.reasonLabel}: ${GROUND_REASON_TEXT[VIOLATION_GROUND.harmfulContent]}.\n\n${WARNING_TEXT.deadline}`;

/** The warning email: a fixed subject, the admin's message, then a fixed reason and one-day block (design D4). */
export function buildWarningEmail(adminMessage: string): NoticeEmailContent {
  return { subject: WARNING_TEXT.subject, text: `${adminMessage}\n\n${WARNING_FRAME}` };
}

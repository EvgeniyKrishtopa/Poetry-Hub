import { siteConfig } from "@/shared/config/site";

import { GROUND_REASON_TEXT } from "./action-notice-copy";
import { VIOLATION_GROUND } from "./violation.constants";
import type { NoticeEmailContent } from "./violation.types";

// Draft wording for the owner to confirm. "One day" is relative to this email, because `warned_at` is set only after
// the email service accepted it (design D4).

const WARNING_SUBJECT = `${siteConfig.name}: предупреждение о нарушении правил`;

const WARNING_FRAME = `Причина предупреждения: ${GROUND_REASON_TEXT[VIOLATION_GROUND.harmfulContent]}.\n\nУ вас есть один день с момента этого письма, чтобы ответить. После этого администратор примет решение.`;

/** The warning email: a fixed subject, the admin's message, then a fixed reason and one-day block (design D4). */
export function buildWarningEmail(adminMessage: string): NoticeEmailContent {
  return { subject: WARNING_SUBJECT, text: `${adminMessage}\n\n${WARNING_FRAME}` };
}

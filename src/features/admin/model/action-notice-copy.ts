import { siteConfig } from "@/shared/config/site";

import { ACTION_NOTICE_KIND, VIOLATION_GROUND } from "./violation.constants";
import type { ActionNoticeContent, NoticeEmailContent, ViolationGround } from "./violation.types";

// Draft wording for the owner to confirm (design Open Questions); the About proposal (task 6.2) must use the same
// reasons, so the user reads one rule in both places.

/** The reason a user is told, per ground; shared with the warning email. */
export const GROUND_REASON_TEXT: Record<ViolationGround, string> = {
  [VIOLATION_GROUND.harmfulContent]: "размещение вредоносного контента",
  [VIOLATION_GROUND.maliciousActivity]: "вредоносная активность на сайте",
};

/** The reason when the user has no open case at that moment. */
const GENERAL_REASON_TEXT = "нарушение правил сайта";

/** A fixed subject per kind: it never holds user text, so a title with a line break cannot reach a header. */
const SUBJECTS = {
  [ACTION_NOTICE_KIND.block]: `${siteConfig.name}: ваш аккаунт заблокирован`,
  [ACTION_NOTICE_KIND.ban]: `${siteConfig.name}: ваш аккаунт забанен`,
  [ACTION_NOTICE_KIND.deletePoem]: `${siteConfig.name}: ваше произведение удалено`,
  [ACTION_NOTICE_KIND.deleteCollection]: `${siteConfig.name}: ваш сборник удалён`,
} as const;

function describeAction(content: ActionNoticeContent): string {
  switch (content.kind) {
    case ACTION_NOTICE_KIND.block:
      return "Ваш аккаунт заблокирован.";
    case ACTION_NOTICE_KIND.ban:
      return "Ваш аккаунт забанен.";
    case ACTION_NOTICE_KIND.deletePoem:
      return content.title === null
        ? "Ваше произведение удалено администратором."
        : `Ваше произведение «${content.title}» удалено администратором.`;
    case ACTION_NOTICE_KIND.deleteCollection:
      return content.title === null
        ? "Ваш сборник удалён администратором."
        : `Ваш сборник «${content.title}» удалён администратором.`;
  }
}

/**
 * The standard email after a restricting action: a fixed subject per kind with no user text, and a body with the
 * reason from the ground or a general one. A title is plain text in the body only (design D5).
 */
export function buildActionNoticeEmail(content: ActionNoticeContent): NoticeEmailContent {
  const reason = content.ground === null ? GENERAL_REASON_TEXT : GROUND_REASON_TEXT[content.ground];
  return {
    subject: SUBJECTS[content.kind],
    text: `Здравствуйте!\n\n${describeAction(content)}\n\nПричина: ${reason}.\n\nЭто автоматическое сообщение.`,
  };
}

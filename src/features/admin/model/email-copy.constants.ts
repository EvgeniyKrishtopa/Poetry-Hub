import { siteConfig } from "@/shared/config/site";

import { ACTION_NOTICE_KIND, VIOLATION_GROUND } from "./violation.constants";

// Draft wording for the owner to confirm (design Open Questions); the About proposal (task 6.2) must use the same
// reasons, so the user reads one rule in both places. Every text an email holds lives here, none in the builders.

/** The reason a user is told, per ground; shared by the standard notice and the warning. */
export const GROUND_REASON_TEXT = {
  [VIOLATION_GROUND.harmfulContent]: "размещение вредоносного контента",
  [VIOLATION_GROUND.maliciousActivity]: "вредоносная активность на сайте",
} as const;

/** The reason when the user has no open case at that moment. */
export const GENERAL_REASON_TEXT = "нарушение правил сайта";

/** A fixed subject per kind: it never holds user text, so a title with a line break cannot reach a header. */
export const NOTICE_SUBJECT = {
  [ACTION_NOTICE_KIND.block]: `${siteConfig.name}: ваш аккаунт заблокирован`,
  [ACTION_NOTICE_KIND.ban]: `${siteConfig.name}: ваш аккаунт забанен`,
  [ACTION_NOTICE_KIND.deletePoem]: `${siteConfig.name}: ваше произведение удалено`,
  [ACTION_NOTICE_KIND.deleteCollection]: `${siteConfig.name}: ваш сборник удалён`,
} as const;

/** The sentence that says what happened; a title, when there is one, appears in the body only (design D5). */
export const NOTICE_ACTION_TEXT = {
  [ACTION_NOTICE_KIND.block]: "Ваш аккаунт заблокирован.",
  [ACTION_NOTICE_KIND.ban]: "Ваш аккаунт забанен.",
  [ACTION_NOTICE_KIND.deletePoem]: {
    untitled: "Ваше произведение удалено администратором.",
    titled: (title: string) => `Ваше произведение «${title}» удалено администратором.`,
  },
  [ACTION_NOTICE_KIND.deleteCollection]: {
    untitled: "Ваш сборник удалён администратором.",
    titled: (title: string) => `Ваш сборник «${title}» удалён администратором.`,
  },
} as const;

/** The fixed parts around the sentence of a standard notice. */
export const NOTICE_FRAME_TEXT = {
  greeting: "Здравствуйте!",
  reasonLabel: "Причина",
  footer: "Это автоматическое сообщение.",
} as const;

/** The warning email's fixed parts; the admin's own message goes first. "One day" counts from this email (design D4). */
export const WARNING_TEXT = {
  subject: `${siteConfig.name}: предупреждение о нарушении правил`,
  reasonLabel: "Причина предупреждения",
  deadline:
    "У вас есть один день с момента этого письма, чтобы ответить. После этого администратор примет решение.",
} as const;

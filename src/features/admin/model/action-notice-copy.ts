import {
  GENERAL_REASON_TEXT,
  GROUND_REASON_TEXT,
  NOTICE_ACTION_TEXT,
  NOTICE_FRAME_TEXT,
  NOTICE_SUBJECT,
} from "./email-copy.constants";
import { ACTION_NOTICE_KIND } from "./violation.constants";
import type { ActionNoticeContent, NoticeEmailContent } from "./violation.types";

/** The sentence that says what happened to the user, naming the title when the database gave one. */
function describeAction(content: ActionNoticeContent): string {
  switch (content.kind) {
    case ACTION_NOTICE_KIND.block:
    case ACTION_NOTICE_KIND.ban:
      return NOTICE_ACTION_TEXT[content.kind];
    case ACTION_NOTICE_KIND.deletePoem:
    case ACTION_NOTICE_KIND.deleteCollection: {
      const text = NOTICE_ACTION_TEXT[content.kind];
      return content.title === null ? text.untitled : text.titled(content.title);
    }
  }
}

/**
 * The standard email after a restricting action: a fixed subject per kind with no user text, and a body with the
 * reason from the ground or a general one. A title is plain text in the body only (design D5).
 */
export function buildActionNoticeEmail(content: ActionNoticeContent): NoticeEmailContent {
  const reason = content.ground === null ? GENERAL_REASON_TEXT : GROUND_REASON_TEXT[content.ground];
  const { greeting, reasonLabel, footer } = NOTICE_FRAME_TEXT;
  return {
    subject: NOTICE_SUBJECT[content.kind],
    text: `${greeting}\n\n${describeAction(content)}\n\n${reasonLabel}: ${reason}.\n\n${footer}`,
  };
}

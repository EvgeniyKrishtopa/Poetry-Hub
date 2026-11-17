import "server-only";

import type { ActionNoticeResult, SendActionNoticeInput } from "../model/violation.types";

/**
 * The standard email after a restricting action, never decisive for the action: one send, one retry on a
 * transient failure under the same key, then `admin_log_notice` best-effort (design D5, FR-9, FR-14).
 */
export async function sendActionNotice(input: SendActionNoticeInput): Promise<ActionNoticeResult> {
  void input;
  throw new Error("not implemented");
}

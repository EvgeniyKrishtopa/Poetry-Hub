"use server";

import { sendWarningSchema } from "../model/violation.schema";
import type { SendWarningActionResult } from "../model/violation.types";

import { adminActionClient } from "./action-client";

/**
 * Warns the user of a case: validate, session, `admin_start_warning`, one email under the key
 * `violation-warning-<caseId>`, and `admin_mark_warned` only after the email was accepted (design D4).
 */
export const sendWarningAction = adminActionClient
  .inputSchema(sendWarningSchema)
  .action(async (): Promise<SendWarningActionResult> => {
    throw new Error("not implemented");
  });

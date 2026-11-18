"use server";

import { removeViolationCase } from "../dal/violation-rpc";
import { toRemoveCaseActionResult } from "../model/violation-action-results";
import { caseIdSchema } from "../model/violation.schema";
import type { RemoveCaseActionResult } from "../model/violation.types";

import { adminActionClient } from "./action-client";
import { checkSession } from "./session-check";

/** Removes a case from the review list: validate, session, then `admin_remove_violation_case`. */
export const removeViolationCaseAction = adminActionClient
  .inputSchema(caseIdSchema)
  .action(async ({ parsedInput }): Promise<RemoveCaseActionResult> => {
    const session = await checkSession();
    if (!session.ok) return { ok: false, reason: session.failure };

    const write = await removeViolationCase(parsedInput);
    return toRemoveCaseActionResult(write);
  });

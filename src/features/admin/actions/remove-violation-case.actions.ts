"use server";

import { caseIdSchema } from "../model/violation.schema";
import type { RemoveCaseActionResult } from "../model/violation.types";

import { adminActionClient } from "./action-client";

/** Removes a case from the review list: validate, session, then `admin_remove_violation_case`. */
export const removeViolationCaseAction = adminActionClient
  .inputSchema(caseIdSchema)
  .action(async (): Promise<RemoveCaseActionResult> => {
    throw new Error("not implemented");
  });

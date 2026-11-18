"use server";

import { addViolationCase, addViolationCaseForAuthor } from "../dal/violation-rpc";
import { toAddCaseActionResult } from "../model/violation-action-results";
import { addViolationCaseForAuthorSchema, addViolationCaseSchema } from "../model/violation.schema";
import type { AddCaseActionResult } from "../model/violation.types";

import { adminActionClient } from "./action-client";
import { checkSession } from "./session-check";

/** Adds a user to the review list from the `/admin` list: validate, session, then `admin_add_violation_case`. */
export const addViolationCaseAction = adminActionClient
  .inputSchema(addViolationCaseSchema)
  .action(async ({ parsedInput }): Promise<AddCaseActionResult> => {
    const session = await checkSession();
    if (!session.ok) return { ok: false, reason: session.failure };

    return toAddCaseActionResult(await addViolationCase(parsedInput));
  });

/** Adds an author to the review list from a public page, by profile id: `admin_add_violation_case_for_author`. */
export const addViolationCaseForAuthorAction = adminActionClient
  .inputSchema(addViolationCaseForAuthorSchema)
  .action(async ({ parsedInput }): Promise<AddCaseActionResult> => {
    const session = await checkSession();
    if (!session.ok) return { ok: false, reason: session.failure };

    return toAddCaseActionResult(await addViolationCaseForAuthor(parsedInput));
  });

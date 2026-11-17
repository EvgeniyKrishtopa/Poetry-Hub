"use server";

import { addViolationCaseForAuthorSchema, addViolationCaseSchema } from "../model/violation.schema";
import type { AddCaseActionResult } from "../model/violation.types";

import { adminActionClient } from "./action-client";

/** Adds a user to the review list from the `/admin` list: validate, session, then `admin_add_violation_case`. */
export const addViolationCaseAction = adminActionClient
  .inputSchema(addViolationCaseSchema)
  .action(async (): Promise<AddCaseActionResult> => {
    throw new Error("not implemented");
  });

/** Adds an author to the review list from a public page, by profile id: `admin_add_violation_case_for_author`. */
export const addViolationCaseForAuthorAction = adminActionClient
  .inputSchema(addViolationCaseForAuthorSchema)
  .action(async (): Promise<AddCaseActionResult> => {
    throw new Error("not implemented");
  });

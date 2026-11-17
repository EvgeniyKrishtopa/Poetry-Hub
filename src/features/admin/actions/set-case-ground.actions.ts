"use server";

import { setCaseGroundSchema } from "../model/violation.schema";
import type { SetCaseGroundActionResult } from "../model/violation.types";

import { adminActionClient } from "./action-client";

/** Changes a case's ground: validate, session, then `admin_set_case_ground`. */
export const setCaseGroundAction = adminActionClient
  .inputSchema(setCaseGroundSchema)
  .action(async (): Promise<SetCaseGroundActionResult> => {
    throw new Error("not implemented");
  });

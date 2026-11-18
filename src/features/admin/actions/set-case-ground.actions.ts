"use server";

import { setCaseGround } from "../dal/violation-rpc";
import { toSetCaseGroundActionResult } from "../model/violation-action-results";
import { setCaseGroundSchema } from "../model/violation.schema";
import type { SetCaseGroundActionResult } from "../model/violation.types";

import { adminActionClient } from "./action-client";
import { checkSession } from "./session-check";

/** Changes a case's ground: validate, session, then `admin_set_case_ground`. */
export const setCaseGroundAction = adminActionClient
  .inputSchema(setCaseGroundSchema)
  .action(async ({ parsedInput }): Promise<SetCaseGroundActionResult> => {
    const session = await checkSession();
    if (!session.ok) return { ok: false, reason: session.failure };

    const write = await setCaseGround(parsedInput);
    return toSetCaseGroundActionResult(write);
  });

import { banUserAction } from "../../actions/ban-user.actions";
import { blockUserAction } from "../../actions/block-user.actions";
import { removeViolationCaseAction } from "../../actions/remove-violation-case.actions";
import { setCaseGroundAction } from "../../actions/set-case-ground.actions";
import type { ModerationActionResult } from "../../model/admin.types";
import type { RemoveCaseActionResult, SetCaseGroundActionResult, ViolationGround } from "../../model/violation.types";

// Each runner returns the action's `data`; `callCaseAction` turns a throw or a missing answer into `unavailable`.

export async function runSetGround(caseId: string, ground: ViolationGround): Promise<SetCaseGroundActionResult | undefined> {
  const response = await setCaseGroundAction({ caseId, ground });
  return response.data;
}

export async function runRemoveCase(caseId: string): Promise<RemoveCaseActionResult | undefined> {
  const response = await removeViolationCaseAction({ caseId });
  return response.data;
}

export async function runBlockOrBan(
  kind: "block" | "ban",
  userId: string,
): Promise<ModerationActionResult | undefined> {
  if (kind === "block") {
    const response = await blockUserAction({ userId });
    return response.data;
  }
  const response = await banUserAction({ userId });
  return response.data;
}

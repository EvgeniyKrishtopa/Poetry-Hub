import { VIOLATION_GROUND } from "./violation.constants";
import type { ViolationGround } from "./violation.types";

/** The ground a «switch the ground» click moves a case to: with two grounds, the other one (FR-7). */
export function otherGround(ground: ViolationGround): ViolationGround {
  if (ground === VIOLATION_GROUND.harmfulContent) return VIOLATION_GROUND.maliciousActivity;
  return VIOLATION_GROUND.harmfulContent;
}

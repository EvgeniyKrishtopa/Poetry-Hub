import type {
  AddCaseActionResult,
  CaseWriteResult,
  RemoveCaseActionResult,
  SetCaseGroundActionResult,
} from "./violation.types";

/** The add function's answer in the terms the dialogs show (FR-1, FR-2, FR-15). */
export function toAddCaseActionResult(write: CaseWriteResult): AddCaseActionResult {
  void write;
  throw new Error("not implemented");
}

/** The set-ground function's answer; a missing case is its own reason, not "user not found". */
export function toSetCaseGroundActionResult(write: CaseWriteResult): SetCaseGroundActionResult {
  void write;
  throw new Error("not implemented");
}

/** The remove function's answer. */
export function toRemoveCaseActionResult(write: CaseWriteResult): RemoveCaseActionResult {
  void write;
  throw new Error("not implemented");
}

"use client";

import type { UseAddViolationCaseOptions, UseAddViolationCaseResult } from "./use-add-violation-case.types";

/** The add call both entry points share: pending flag, the answer, and the offline guard (design D7). */
export function useAddViolationCase(options: UseAddViolationCaseOptions): UseAddViolationCaseResult {
  void options;
  throw new Error("not implemented");
}

import type { CaseFailureReason } from "../model/violation.types";

/** An action's answer, or `unavailable` when the call threw or came back with no answer (FR-15). */
export async function callCaseAction<Result extends { readonly ok: boolean }>(
  run: () => Promise<Result | undefined>,
): Promise<Result | { readonly ok: false; readonly reason: Extract<CaseFailureReason, "unavailable"> }> {
  void run;
  throw new Error("not implemented");
}

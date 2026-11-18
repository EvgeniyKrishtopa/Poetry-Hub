import type { CaseFailureReason } from "../model/violation.types";

const NO_ANSWER = { ok: false, reason: "unavailable" } as const satisfies {
  readonly ok: false;
  readonly reason: Extract<CaseFailureReason, "unavailable">;
};

/**
 * An action's answer, or `unavailable` when the call threw or came back with no answer (a rejected input, a lost
 * response): nothing is known to have changed, and the admin sees the outage text (FR-15). `run` returns the
 * action's `data`.
 */
export async function callCaseAction<Result extends { readonly ok: boolean }>(
  run: () => Promise<Result | undefined>,
): Promise<Result | typeof NO_ANSWER> {
  try {
    const answer = await run();
    return answer ?? NO_ANSWER;
  } catch {
    return NO_ANSWER;
  }
}

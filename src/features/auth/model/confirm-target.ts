import type { ConfirmOutcome } from "./auth.types";

/**
 * Where `/auth/confirm` sends the browser: always one of a few fixed paths, never a request parameter.
 * Takes the link's raw `type` and parses it itself, so the route needs nothing else; an unknown type reads as a
 * failed sign-up link (password-recovery design D1, auth FR-5).
 */
export function getConfirmTarget(type: string | null, outcome: ConfirmOutcome): string {
  void type;
  void outcome;
  throw new Error("not implemented");
}

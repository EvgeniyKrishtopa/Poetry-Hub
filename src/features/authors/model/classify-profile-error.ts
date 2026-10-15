import type { ProfileFailure } from "./author.types";

/** PostgREST, Storage, and config errors → the failure the editor shows (design D10). */
export function classifyProfileError(error: unknown): ProfileFailure {
  void error;
  throw new Error("not implemented");
}

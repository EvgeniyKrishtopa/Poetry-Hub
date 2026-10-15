import type { ProfileFailure } from "./author.types";

// Every string of the proposal's UI copy table, in Russian, lands here in task 3.1 (NFR-8).

/** The message shown under a field for a failed read or write (FR-9). */
export function getProfileFailureMessage(failure: ProfileFailure): string {
  void failure;
  throw new Error("not implemented");
}

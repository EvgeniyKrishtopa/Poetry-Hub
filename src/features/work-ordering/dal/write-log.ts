import "server-only";

import type { ServiceFailure } from "../model/work-ordering.types";

// The feature's own copy of the sibling features' log helpers: a log line carries the operation and the failure
// kind only, never a title or an id (NFR-7).

/** Logs `[work-ordering] <operation> failed: <kind>`. */
export function logFailure(operation: string, error: unknown): void {
  void operation;
  void error;
  throw new Error("not implemented");
}

/** Logs the failure and classifies it for the caller. */
export function toServiceFailure(operation: string, error: unknown): ServiceFailure {
  void operation;
  void error;
  throw new Error("not implemented");
}

/** A PostgREST error with the response status merged in, keeping only the code. */
export function withStatus(
  error: { readonly code?: string },
  status: number,
): { readonly code?: string; readonly status: number } {
  void error;
  void status;
  throw new Error("not implemented");
}

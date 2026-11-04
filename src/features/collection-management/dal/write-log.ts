import "server-only";

import type { ServiceFailure } from "../model/collection-management.types";

// The feature's own copy of poem-management's write-log helpers (design D12): a log line carries the operation
// and the failure kind only, never a title, a description, or an id (NFR-5).

/** Logs `[collection-management] <operation> failed: <kind>`. */
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

/** A PostgREST error with the response status merged in, so a 401, a 5xx, or status 0 classifies right. */
export function withStatus(
  error: { readonly code?: string },
  status: number,
): { readonly code?: string; readonly status: number } {
  void error;
  void status;
  throw new Error("not implemented");
}

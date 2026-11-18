import type { EmailFailureReason } from "@/shared/lib/email";

/** A service answer from this status up is a server fault; below it, the request was refused. */
const HTTP_SERVER_ERROR_MIN = 500;

/**
 * A 409 the client did not read as an accepted key: a request with that key is still in progress, and may yet fail
 * or succeed. The email client keeps its own copy of this number; the feature can't import the module's internals.
 */
const HTTP_STATUS_CONFLICT = 409;

/**
 * Whether a failed send may have been delivered, or may pass on a retry: a timeout, a network error, a 409 that is not
 * an accepted-key conflict, or a service answer of 500 or more. A missing config and any other answer below 500 prove
 * nothing was accepted (design D4, D5).
 */
export function isTransientEmailFailure(failure: {
  readonly reason: EmailFailureReason;
  readonly status?: number;
}): boolean {
  if (failure.reason === "timeout" || failure.reason === "network") return true;
  if (failure.reason !== "http") return false;
  const status = failure.status ?? 0;
  return status === HTTP_STATUS_CONFLICT || status >= HTTP_SERVER_ERROR_MIN;
}

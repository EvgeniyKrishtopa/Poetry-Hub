import type { EmailFailureReason } from "@/shared/lib/email";

/** A service answer from this status up is a server fault; below it, the request was refused. */
const HTTP_SERVER_ERROR_MIN = 500;

/**
 * Whether a failed send may have been delivered, or may pass on a retry: a timeout, a network error, or a service
 * answer of 500 or more. A missing config and an answer below 500 prove nothing was accepted (design D4, D5).
 */
export function isTransientEmailFailure(failure: {
  readonly reason: EmailFailureReason;
  readonly status?: number;
}): boolean {
  if (failure.reason === "timeout" || failure.reason === "network") return true;
  return failure.reason === "http" && (failure.status ?? 0) >= HTTP_SERVER_ERROR_MIN;
}

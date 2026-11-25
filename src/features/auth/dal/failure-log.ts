import "server-only";

import { SupabaseConfigError } from "@/shared/lib/supabase";

// The feature's own copy of the other features' write-log helpers: a log line carries the operation and the failure
// kind only, never a user id, an address or a password (password-recovery NFR-1). A fix here belongs in the twins too.

/** A loggable label: the error class name, or the PostgREST code. Never a message: it can quote values. */
function describeError(error: unknown): string {
  if (error instanceof Error) return error.name;
  if (typeof error === "object" && error !== null && "name" in error && typeof error.name === "string") {
    return error.name;
  }
  if (typeof error === "object" && error !== null && "code" in error) {
    return typeof error.code === "string" && error.code !== "" ? `PostgrestError ${error.code}` : "PostgrestError";
  }
  return typeof error;
}

/** Logs `[auth] <operation> failed: <kind>`. */
export function logFailure(operation: string, error: unknown): void {
  // The proxy already logs a missing config on every request.
  if (!(error instanceof SupabaseConfigError)) {
    console.error(`[auth] ${operation} failed: ${describeError(error)}`);
  }
}

/**
 * A PostgREST error with the response status merged in: postgrest-js keeps the status on the response, so without
 * it a 401, a 5xx, or a network failure (status 0) would not classify. Only the code is kept: the message and
 * details can quote values.
 */
export function withStatus(
  error: { readonly code?: string },
  status: number,
): { readonly code?: string; readonly status: number } {
  return { code: error.code, status };
}

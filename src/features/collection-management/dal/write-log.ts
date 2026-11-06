import "server-only";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { classifySupabaseError } from "@/shared/lib/supabase/classify-error";

import type { ServiceFailure } from "../model/collection-management.types";

// The feature's own copy of poem-management's write-log helpers (design D12): a log line carries the operation
// and the failure kind only, never a title, a description, or an id (NFR-5). A fix here belongs in the twin too.

/** A loggable label: the error class name, or the PostgREST code. Never a message: it can quote row values. */
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

/** Logs `[collection-management] <operation> failed: <kind>`. */
export function logFailure(operation: string, error: unknown): void {
  // The proxy already logs a missing config on every request.
  if (!(error instanceof SupabaseConfigError)) {
    console.error(`[collection-management] ${operation} failed: ${describeError(error)}`);
  }
}

/** Logs the failure and classifies it for the caller. */
export function toServiceFailure(operation: string, error: unknown): ServiceFailure {
  logFailure(operation, error);
  return classifySupabaseError(error);
}

/**
 * A PostgREST error with the response status merged in: postgrest-js keeps the status on the response, so
 * without it a 401, a 5xx, or a network failure (status 0) would classify as `unknown`. Only the code is kept:
 * the message and details can quote the collection.
 */
export function withStatus(
  error: { readonly code?: string },
  status: number,
): { readonly code?: string; readonly status: number } {
  return { code: error.code, status };
}

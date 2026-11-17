import "server-only";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { classifySupabaseError } from "@/shared/lib/supabase/classify-error";

import type { AdminFailure } from "../model/admin.types";

// A log line carries the operation and the failure kind only, never an email, an id, a title or a path (NFR-6).
// The feature's own copy of its siblings' write-log helpers: the features don't import each other.

/** SQLSTATE `assert_admin()` raises for a caller who is not an admin (design D2). */
const INSUFFICIENT_PRIVILEGE = "42501";

const HTTP_UNAUTHORIZED = 401;

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

/** Logs `[admin] <operation> failed: <kind>`. */
export function logFailure(operation: string, error: unknown): void {
  // The proxy already logs a missing config on every request.
  if (!(error instanceof SupabaseConfigError)) {
    console.error(`[admin] ${operation} failed: ${describeError(error)}`);
  }
}

function readCode(error: unknown): unknown {
  return typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
}

function readStatus(error: unknown): unknown {
  return typeof error === "object" && error !== null && "status" in error ? error.status : undefined;
}

/**
 * Logs the failure and classifies it for the caller. A refused admin check (42501 with a session the database
 * recognised) is `forbidden`; the same code behind a 401 is an ended session, which Supabase's own classifier already
 * reads as `unauthenticated`, so it is left to it.
 */
export function toAdminFailure(operation: string, error: unknown): AdminFailure {
  logFailure(operation, error);
  if (readCode(error) === INSUFFICIENT_PRIVILEGE && readStatus(error) !== HTTP_UNAUTHORIZED) return "forbidden";
  return classifySupabaseError(error);
}

/**
 * A PostgREST error with the response status merged in: postgrest-js keeps the status on the response, so without it a
 * 401, a 5xx or a network failure (status 0) would classify as `unknown`. Only the code is kept: the message and details
 * can quote the row.
 */
export function withStatus(
  error: { readonly code?: string },
  status: number,
): { readonly code?: string; readonly status: number } {
  return { code: error.code, status };
}

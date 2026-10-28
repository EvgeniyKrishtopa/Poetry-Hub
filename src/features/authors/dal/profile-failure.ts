import "server-only";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { classifySupabaseError } from "@/shared/lib/supabase/classify-error";

import type { ProfileFailure } from "../model/author.types";

/**
 * A PostgREST error with its response status merged in. postgrest-js keeps the status on the
 * response, not on its plain error object, so without the merge a 401, a 5xx, or a network failure
 * (status 0) would classify as `unknown`. Only the code is kept: the message and details can quote
 * row values.
 */
export function withStatus(
  error: { readonly code?: string },
  status: number,
): { readonly code?: string; readonly status: number } {
  return { code: error.code, status };
}

/** A loggable label: the error class name, or the PostgREST code. Never a message (NFR-3). */
function describeError(error: unknown): string {
  if (error instanceof Error) return error.name;
  if (typeof error === "object" && error !== null && "code" in error) {
    return typeof error.code === "string" && error.code !== "" ? `PostgrestError ${error.code}` : "PostgrestError";
  }
  return typeof error;
}

/** Logs `[authors] <operation> failed: <name>` and classifies the error for the editor (design D10). */
export function toProfileFailure(operation: string, error: unknown): ProfileFailure {
  // The proxy already logs a missing config on every request.
  if (!(error instanceof SupabaseConfigError)) {
    console.error(`[authors] ${operation} failed: ${describeError(error)}`);
  }
  return classifySupabaseError(error);
}

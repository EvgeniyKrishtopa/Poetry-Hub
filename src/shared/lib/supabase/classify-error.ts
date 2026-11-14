import { SupabaseConfigError } from "./errors";

/** Why a Supabase read or write failed, in the terms the UI shows. */
export type SupabaseFailure = "unauthenticated" | "restricted" | "unavailable" | "unknown";

/**
 * The SQLSTATE `assert_not_restricted()` raises for a blocked or banned account. A dedicated code, because
 * 42501 already means "not signed in" in the writers and "not an admin" in the admin functions.
 */
const RESTRICTED_ERROR_CODE = "AM001";

/** PostgREST's codes for an invalid or expired JWT, and for failed claims validation. */
const JWT_ERROR_CODES: ReadonlySet<string> = new Set(["PGRST301", "PGRST303"]);

const HTTP_UNAUTHORIZED = 401;
const HTTP_SERVER_ERROR = 500;
/** postgrest-js reports a request that never got a response (network failure) as status 0. */
const NO_RESPONSE_STATUS = 0;

/** Storage reports a network failure as this error class rather than a status. */
const STORAGE_NETWORK_ERROR_NAME = "StorageUnknownError";

function readProperty(error: unknown, key: string): unknown {
  return typeof error === "object" && error !== null && key in error
    ? (error as Record<string, unknown>)[key]
    : undefined;
}

/**
 * The HTTP status, from `status` (a number: Storage and auth errors, or a PostgREST response's
 * status merged in by the DAL) or `statusCode` (a string on Storage errors).
 */
function readStatus(error: unknown): number | undefined {
  const status = readProperty(error, "status");
  if (typeof status === "number") return status;
  const statusCode = readProperty(error, "statusCode");
  return typeof statusCode === "string" && /^\d+$/.test(statusCode) ? Number(statusCode) : undefined;
}

/** PostgREST, Storage, and config errors → the failure the UI shows (add-author-profiles design D10). */
export function classifySupabaseError(error: unknown): SupabaseFailure {
  if (error instanceof SupabaseConfigError) return "unavailable";

  const code = readProperty(error, "code");
  // Before every other mapping: the writers drop the PostgREST message on purpose, so the code alone carries it.
  if (code === RESTRICTED_ERROR_CODE) return "restricted";
  if (typeof code === "string" && JWT_ERROR_CODES.has(code)) return "unauthenticated";

  const status = readStatus(error);
  if (status === HTTP_UNAUTHORIZED) return "unauthenticated";
  if (status === NO_RESPONSE_STATUS || (status !== undefined && status >= HTTP_SERVER_ERROR)) return "unavailable";

  // A thrown `fetch` failure is a TypeError.
  if (error instanceof TypeError || readProperty(error, "name") === STORAGE_NETWORK_ERROR_NAME) return "unavailable";

  // Everything else, including 42501: with a valid session that is a grant or policy bug.
  return "unknown";
}

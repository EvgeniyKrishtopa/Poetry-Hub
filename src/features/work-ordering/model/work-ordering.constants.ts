/** Moves allowed per minute per account (NFR-2); the migration's `order_move` scope uses the same number: keep the two in step. */
export const MOVE_LIMIT_PER_MINUTE = 30;

/** The limit's scope in `write_rate_limits` (design D2). */
export const MOVE_LIMIT_SCOPE = "order_move";

/** What the database's move functions answer (design D2). */
export const MOVE_DB_STATUS = {
  moved: "moved",
  stale: "stale",
  notFound: "not-found",
} as const;

/** A lowercase UUID: the only id shape a move may name; anything else is refused before the limit counts (design D6). */
export const LOWERCASE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Why a move did not happen, in the terms the board shows (FR-6, FR-11, design D6). */
export const MOVE_FAILURE_REASON = {
  rateLimited: "rate-limited",
  stale: "stale",
  unauthenticated: "unauthenticated",
  failed: "failed",
} as const;

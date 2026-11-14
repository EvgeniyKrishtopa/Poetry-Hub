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
  restricted: "restricted",
  stale: "stale",
  unauthenticated: "unauthenticated",
  failed: "failed",
} as const;

/** A mouse drag starts after the pointer moved this far, so a plain click on a handle never lifts (FR-7). */
export const MOUSE_DRAG_DISTANCE_PX = 4;

/** A touch drag starts after a hold on the handle this long, so a swipe from the handle still scrolls (FR-7, design D5). */
export const TOUCH_HOLD_MS = 200;

/** How far a finger may drift during the hold before the hold is a scroll instead (design D5). */
export const TOUCH_HOLD_TOLERANCE_PX = 5;

/** Space alone lifts and drops, Escape cancels; the library's default would also lift and drop on Enter (FR-7). */
export const KEYBOARD_CODES: { start: string[]; end: string[]; cancel: string[] } = {
  start: ["Space"],
  end: ["Space"],
  cancel: ["Escape"],
};

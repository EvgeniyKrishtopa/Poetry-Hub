/** What the save forms read: no connection, a slow one by the browser's own estimate, or a normal one (edit-poem design D8). */
export const CONNECTION_STATUS = {
  online: "online",
  slow: "slow",
  offline: "offline",
} as const;

/** The browser's effective connection types that count as slow (edit-poem design D8). */
export const SLOW_EFFECTIVE_TYPES: readonly string[] = ["slow-2g", "2g"];

/** A round-trip estimate above this many milliseconds counts as slow (edit-poem design D8). */
export const SLOW_RTT_MS = 1000;

"use client";

/** What the save forms read: no connection, a slow one by the browser's own estimate, or a normal one. */
export type ConnectionStatus = "online" | "slow" | "offline";

/**
 * The browser's connection state, live: `offline` from `navigator.onLine`, `slow` from the Network Information
 * API where the browser has one, `online` otherwise and on the server (edit-poem design D8).
 */
export function useConnectionStatus(): ConnectionStatus {
  throw new Error("not implemented");
}

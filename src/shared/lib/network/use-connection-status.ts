"use client";

import { useSyncExternalStore } from "react";

import { CONNECTION_STATUS, SLOW_EFFECTIVE_TYPES, SLOW_RTT_MS } from "./network.constants";

export type ConnectionStatus = (typeof CONNECTION_STATUS)[keyof typeof CONNECTION_STATUS];

/** The part of the Network Information API this hook reads; TypeScript's DOM types don't include it. */
interface ConnectionEstimate extends EventTarget {
  readonly effectiveType?: string;
  readonly rtt?: number;
}

function isConnectionEstimate(value: unknown): value is ConnectionEstimate {
  return value instanceof EventTarget;
}

/** `navigator.connection` where the browser has it (Chromium); `null` in Safari and Firefox. */
function readConnectionEstimate(): ConnectionEstimate | null {
  const connection: unknown = "connection" in navigator ? navigator.connection : undefined;
  return isConnectionEstimate(connection) ? connection : null;
}

function isSlow(estimate: ConnectionEstimate | null): boolean {
  if (estimate === null) return false;
  const slowType = estimate.effectiveType !== undefined && SLOW_EFFECTIVE_TYPES.includes(estimate.effectiveType);
  const slowRtt = estimate.rtt !== undefined && estimate.rtt > SLOW_RTT_MS;
  return slowType || slowRtt;
}

/** The browser's own online flag, read once; outside `shared/` nothing reads `navigator.onLine` itself (edit-poem NFR-3). */
export function isBrowserOnline(): boolean {
  return navigator.onLine;
}

function getSnapshot(): ConnectionStatus {
  if (!isBrowserOnline()) return CONNECTION_STATUS.offline;
  return isSlow(readConnectionEstimate()) ? CONNECTION_STATUS.slow : CONNECTION_STATUS.online;
}

// Pages render online; the client corrects the value right after hydration.
function getServerSnapshot(): ConnectionStatus {
  return CONNECTION_STATUS.online;
}

function subscribe(onChange: () => void): () => void {
  const estimate = readConnectionEstimate();
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  estimate?.addEventListener("change", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
    estimate?.removeEventListener("change", onChange);
  };
}

/**
 * The browser's connection state, live: `offline` from `navigator.onLine`, `slow` from the Network Information
 * API where the browser has one, `online` otherwise and on the server (edit-poem design D8). No probe requests.
 */
export function useConnectionStatus(): ConnectionStatus {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

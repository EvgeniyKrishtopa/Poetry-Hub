"use client";

/**
 * A value shown once: read on the first render and again each time a hidden route is revealed, cleared
 * once read, and dropped when the page is left (delete-poem design D5).
 */
export function useOneTimeValue<T>(read: () => T | null, clear: () => void): T | null {
  void read;
  void clear;
  throw new Error("not implemented");
}

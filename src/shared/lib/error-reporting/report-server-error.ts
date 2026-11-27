import "server-only";

/** Sends a scrubbed server error to the tracker; does nothing without a DSN. */
export function reportServerError(error: unknown): void {
  void error;
  throw new Error("not implemented");
}

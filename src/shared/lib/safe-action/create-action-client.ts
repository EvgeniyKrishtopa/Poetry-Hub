import "server-only";

import type { createSafeActionClient } from "next-safe-action";

export interface ActionClientOptions {
  /** Prefix of the log line, e.g. `authors` → `[authors] action failed: <error.name>`. */
  readonly logPrefix: string;
  /** What the client gets back for an unexpected throw. */
  readonly genericMessage: string;
}

export type ActionClient = ReturnType<typeof createSafeActionClient<"flattened", string>>;

/**
 * A next-safe-action client with the one error policy every feature shares: log only the
 * error's `name`, never the input, return the generic message, and use the "flattened"
 * validation-error shape.
 */
export function createActionClient(options: ActionClientOptions): ActionClient {
  void options;
  throw new Error("not implemented");
}

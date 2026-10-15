import "server-only";

import { createSafeActionClient } from "next-safe-action";

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
export function createActionClient({ logPrefix, genericMessage }: ActionClientOptions): ActionClient {
  return createSafeActionClient({
    handleServerError(error) {
      // The error's message or the action input could carry a password or other reader data.
      console.error(`[${logPrefix}] action failed: ${error.name}`);
      return genericMessage;
    },
    defaultValidationErrorsShape: "flattened",
  });
}

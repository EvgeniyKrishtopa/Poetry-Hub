import "server-only";

import type { EmailConfigResult } from "./email.types";

/** Reads the API key and the sender address on each call; a missing or malformed value names its variable only. */
export function readEmailConfig(): EmailConfigResult {
  throw new Error("not implemented");
}

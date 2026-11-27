import "server-only";

import type { TurnstileConfigResult } from "./turnstile.types";

/** Reads the secret key on each call; a missing or malformed value is `{ ok: false }`, never echoed. */
export function readTurnstileConfig(): TurnstileConfigResult {
  throw new Error("not implemented");
}

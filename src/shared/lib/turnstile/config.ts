import "server-only";

import { TURNSTILE_SECRET_KEY_ENV, TURNSTILE_SECRET_PATTERN } from "./turnstile.constants";
import type { TurnstileConfigResult } from "./turnstile.types";

/** Reads the secret key on each call; a missing or malformed value is `{ ok: false }`, never echoed. */
export function readTurnstileConfig(): TurnstileConfigResult {
  const secretKey = process.env[TURNSTILE_SECRET_KEY_ENV];

  if (!secretKey || !TURNSTILE_SECRET_PATTERN.test(secretKey)) return { ok: false };

  return { ok: true, config: { secretKey } };
}

import "server-only";

import { EMAIL_API_KEY_PATTERN, EMAIL_ENV, EMAIL_FROM_PATTERN } from "./email.constants";
import type { EmailConfigResult } from "./email.types";

/** Reads the API key and the sender address on each call; a missing or malformed value names its variable only. */
export function readEmailConfig(): EmailConfigResult {
  const apiKey = process.env[EMAIL_ENV.apiKey];
  const from = process.env[EMAIL_ENV.from];

  if (!apiKey || !EMAIL_API_KEY_PATTERN.test(apiKey)) return { ok: false, variable: EMAIL_ENV.apiKey };
  if (!from || !EMAIL_FROM_PATTERN.test(from)) return { ok: false, variable: EMAIL_ENV.from };

  return { ok: true, config: { apiKey, from } };
}

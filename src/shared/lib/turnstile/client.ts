import "server-only";

import type { TurnstileVerifyResult } from "./turnstile.types";

/** Asks Cloudflare `siteverify` about a token. Never throws, and never logs the token or the secret. */
export async function verifyTurnstileToken(token: string): Promise<TurnstileVerifyResult> {
  void token;
  throw new Error("not implemented");
}

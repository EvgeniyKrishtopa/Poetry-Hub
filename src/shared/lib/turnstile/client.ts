import "server-only";

import { readTurnstileConfig } from "./config";
import { TIMEOUT_ERROR_NAME, TURNSTILE_REQUEST_TIMEOUT_MS, TURNSTILE_SITEVERIFY_URL } from "./turnstile.constants";
import type { TurnstileVerifyResult } from "./turnstile.types";

/** Asks Cloudflare `siteverify` about a token. Never throws, and never logs the token or the secret. */
export async function verifyTurnstileToken(token: string): Promise<TurnstileVerifyResult> {
  const configResult = readTurnstileConfig();
  if (!configResult.ok) return { ok: false, reason: "config" };
  // No token is a refusal already; there is nothing to ask Cloudflare about.
  if (token === "") return { ok: false, reason: "rejected" };
  const { secretKey } = configResult.config;
  const body = new URLSearchParams({ secret: secretKey, response: token });

  let response: Response;
  let bodyText: string;
  try {
    response = await fetch(TURNSTILE_SITEVERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(TURNSTILE_REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
    // The timeout signal still covers this read, so a slow body is a `timeout`, not an `http` failure.
    bodyText = await response.text();
  } catch (error) {
    return toThrownFailure(error);
  }

  if (!response.ok) return { ok: false, reason: "http" };
  return readVerdict(bodyText);
}

/** A thrown request or body read: `timeout` when the signal fired, `network` for anything else. */
function toThrownFailure(error: unknown): TurnstileVerifyResult {
  // Only the name is inspected: the error may carry what was sent.
  const isTimeout = error instanceof DOMException && error.name === TIMEOUT_ERROR_NAME;
  return { ok: false, reason: isTimeout ? "timeout" : "network" };
}

/** Only an explicit `success: true` accepts; a body that is not JSON is an `http` failure. */
function readVerdict(bodyText: string): TurnstileVerifyResult {
  let body: unknown;
  try {
    body = JSON.parse(bodyText);
  } catch {
    return { ok: false, reason: "http" };
  }

  const accepted = typeof body === "object" && body !== null && "success" in body && body.success === true;
  return accepted ? { ok: true } : { ok: false, reason: "rejected" };
}

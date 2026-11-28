import "server-only";

import { readTurnstileConfig } from "./config";
import {
  TIMEOUT_ERROR_NAME,
  TURNSTILE_REQUEST_TIMEOUT_MS,
  TURNSTILE_SECRET_ERROR_CODES,
  TURNSTILE_SITEVERIFY_URL,
  TURNSTILE_TOKEN_MAX_LENGTH,
} from "./turnstile.constants";
import type { TurnstileVerifyResult } from "./turnstile.types";

/** Asks Cloudflare `siteverify` about a token. Never throws, and never logs the token or the secret. */
export async function verifyTurnstileToken(token: string): Promise<TurnstileVerifyResult> {
  const configResult = readTurnstileConfig();
  if (!configResult.ok) return { ok: false, reason: "config" };
  // No token is a refusal already; there is nothing to ask Cloudflare about.
  if (token === "") return { ok: false, reason: "rejected" };
  // Checked here and not in a schema, so a filled honeypot is still answered first.
  if (token.length > TURNSTILE_TOKEN_MAX_LENGTH) return { ok: false, reason: "rejected" };
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
  if (accepted) return { ok: true };

  // A refused secret is the operator's fault: logged as `config`, so it does not read as bot traffic.
  const secretRefused = namesSecretError(body);
  return { ok: false, reason: secretRefused ? "config" : "rejected" };
}

function namesSecretError(body: unknown): boolean {
  if (typeof body !== "object" || body === null || !("error-codes" in body)) return false;
  const codes = body["error-codes"];
  return Array.isArray(codes) && codes.some((code) => TURNSTILE_SECRET_ERROR_CODES.includes(code));
}

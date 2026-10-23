import "server-only";

import { readTelegramConfig } from "./config";
import { TELEGRAM_API_BASE, TELEGRAM_REQUEST_TIMEOUT_MS } from "./telegram.constants";
import type { TelegramSendResult } from "./telegram.types";

const TIMEOUT_ERROR_NAME = "TimeoutError";

/**
 * Sends one plain-text message to the configured chat. Failures come back as values; the URL
 * holds the token, so nothing here logs, throws, or returns it.
 */
export async function sendTelegramMessage(text: string): Promise<TelegramSendResult> {
  const configResult = readTelegramConfig();
  if (!configResult.ok) return { ok: false, reason: "config" };
  const { botToken, chatId } = configResult.config;

  let response: Response;
  try {
    // No `parse_mode`: the text is sent as plain text, so nothing in it is read as markup.
    response = await fetch(`${TELEGRAM_API_BASE}/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: AbortSignal.timeout(TELEGRAM_REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (error) {
    // The error may carry the URL (and so the token): only its name is inspected.
    const isTimeout = error instanceof DOMException && error.name === TIMEOUT_ERROR_NAME;
    return { ok: false, reason: isTimeout ? "timeout" : "network" };
  }

  const accepted = response.ok && (await readOkFlag(response));
  return accepted ? { ok: true } : { ok: false, reason: "http", status: response.status };
}

/** Telegram's own `ok` flag from the body; a body that isn't JSON counts as not ok. */
async function readOkFlag(response: Response): Promise<boolean> {
  try {
    const body: unknown = await response.json();
    return typeof body === "object" && body !== null && "ok" in body && body.ok === true;
  } catch {
    return false;
  }
}

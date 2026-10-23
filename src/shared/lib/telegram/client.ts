import "server-only";

import type { TelegramSendResult } from "./telegram.types";

/**
 * Sends one plain-text message to the configured chat. Failures come back as values; the URL
 * holds the token, so nothing here logs, throws, or returns it.
 */
export async function sendTelegramMessage(text: string): Promise<TelegramSendResult> {
  void text;
  throw new Error("not implemented");
}

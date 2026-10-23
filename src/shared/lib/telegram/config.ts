import "server-only";

import { TELEGRAM_CHAT_ID_PATTERN, TELEGRAM_ENV, TELEGRAM_TOKEN_PATTERN } from "./telegram.constants";
import type { TelegramConfigResult } from "./telegram.types";

/** Reads the bot token and chat id on each call; a missing or malformed value is `{ ok: false }`, never echoed. */
export function readTelegramConfig(): TelegramConfigResult {
  const botToken = process.env[TELEGRAM_ENV.botToken];
  const chatId = process.env[TELEGRAM_ENV.chatId];

  if (!botToken || !TELEGRAM_TOKEN_PATTERN.test(botToken)) return { ok: false };
  if (!chatId || !TELEGRAM_CHAT_ID_PATTERN.test(chatId)) return { ok: false };

  return { ok: true, config: { botToken, chatId } };
}

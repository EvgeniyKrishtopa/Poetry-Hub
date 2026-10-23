import "server-only";

import type { TelegramConfigResult } from "./telegram.types";

/** Reads the bot token and chat id on each call; a missing or malformed value is `{ ok: false }`, never echoed. */
export function readTelegramConfig(): TelegramConfigResult {
  throw new Error("not implemented");
}

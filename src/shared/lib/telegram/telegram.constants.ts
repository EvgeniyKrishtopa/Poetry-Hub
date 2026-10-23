import "server-only";

/** Names of the server-only environment variables the client reads (never `NEXT_PUBLIC_`). */
export const TELEGRAM_ENV = {
  botToken: "TELEGRAM_BOT_TOKEN",
  chatId: "TELEGRAM_CHAT_ID",
} as const;

export const TELEGRAM_API_BASE = "https://api.telegram.org";

/** How long a `sendMessage` call may take before it counts as a `timeout` failure. */
export const TELEGRAM_REQUEST_TIMEOUT_MS = 10_000;

/** The `DOMException` name `AbortSignal.timeout` rejects with once that time is up. */
export const TIMEOUT_ERROR_NAME = "TimeoutError";

/** A bot token as BotFather issues it: the bot id, a colon, then the secret. */
export const TELEGRAM_TOKEN_PATTERN = /^\d+:[A-Za-z0-9_-]+$/;

/** A numeric chat id; groups and channels have negative ids. */
export const TELEGRAM_CHAT_ID_PATTERN = /^-?\d+$/;

import "server-only";

interface TelegramConfig {
  readonly botToken: string;
  readonly chatId: string;
}

export type TelegramConfigResult = { readonly ok: true; readonly config: TelegramConfig } | { readonly ok: false };

type TelegramFailureReason = "config" | "network" | "timeout" | "http";

export type TelegramSendResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly reason: TelegramFailureReason; readonly status?: number };

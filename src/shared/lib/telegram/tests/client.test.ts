// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sendTelegramMessage } from "../client";
import { TELEGRAM_ENV } from "../telegram.constants";
import type { TelegramSendResult } from "../telegram.types";

const BOT_TOKEN = "123456:known-Secret_token";
const CHAT_ID = "-1001234567";
const TEXT = "Новое сообщение\n<b>не разметка</b>";
const HTTP_OK = 200;
const HTTP_SERVER_ERROR = 500;

const fetchMock = vi.fn<typeof fetch>();

function respond(body: string, status = HTTP_OK): void {
  fetchMock.mockResolvedValueOnce(new Response(body, { status }));
}

function respondJson(body: unknown, status = HTTP_OK): void {
  respond(JSON.stringify(body), status);
}

function expectNoSecret(result: TelegramSendResult): void {
  expect(JSON.stringify(result)).not.toContain(BOT_TOKEN);
}

describe("sendTelegramMessage", () => {
  beforeEach(() => {
    vi.stubEnv(TELEGRAM_ENV.botToken, BOT_TOKEN);
    vi.stubEnv(TELEGRAM_ENV.chatId, CHAT_ID);
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  describe("config", () => {
    // implements FR-9, NFR-1 of add-contact-form
    it.each([
      ["a missing token", TELEGRAM_ENV.botToken, undefined],
      ["an empty token", TELEGRAM_ENV.botToken, ""],
      ["a token without the bot id", TELEGRAM_ENV.botToken, "known-Secret_token"],
      ["a token with whitespace", TELEGRAM_ENV.botToken, "123456:two words"],
      ["a missing chat id", TELEGRAM_ENV.chatId, undefined],
      ["a non-numeric chat id", TELEGRAM_ENV.chatId, "@my_channel"],
    ])("fails with reason config and sends nothing for %s", async (_case, name, value) => {
      vi.stubEnv(name, value);

      const result = await sendTelegramMessage(TEXT);

      expect(result).toEqual({ ok: false, reason: "config" });
      expect(fetchMock).not.toHaveBeenCalled();
      expectNoSecret(result);
    });

    it("accepts a positive chat id", async () => {
      vi.stubEnv(TELEGRAM_ENV.chatId, "987654");
      respondJson({ ok: true });

      expect(await sendTelegramMessage(TEXT)).toEqual({ ok: true });
    });
  });

  describe("request", () => {
    // implements FR-6 of add-contact-form
    it("POSTs chat_id and text once to the bot's sendMessage endpoint, with no parse_mode and a timeout signal", async () => {
      respondJson({ ok: true });

      await sendTelegramMessage(TEXT);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] ?? [];
      expect(url).toBe(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`);
      expect(init?.method).toBe("POST");
      expect(init?.headers).toEqual({ "Content-Type": "application/json" });
      expect(JSON.parse(String(init?.body))).toEqual({ chat_id: CHAT_ID, text: TEXT });
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      expect(init?.cache).toBe("no-store");
    });
  });

  describe("result", () => {
    it("is ok when Telegram answers 200 with ok: true", async () => {
      respondJson({ ok: true, result: { message_id: 1 } });

      expect(await sendTelegramMessage(TEXT)).toEqual({ ok: true });
    });

    // implements FR-9, NFR-1 of add-contact-form
    it("reports http with the status for an HTTP error", async () => {
      respondJson({ ok: false, error_code: HTTP_SERVER_ERROR }, HTTP_SERVER_ERROR);

      const result = await sendTelegramMessage(TEXT);

      expect(result).toEqual({ ok: false, reason: "http", status: HTTP_SERVER_ERROR });
      expectNoSecret(result);
    });

    it("reports http 200 when Telegram answers 200 with ok: false", async () => {
      respondJson({ ok: false });

      expect(await sendTelegramMessage(TEXT)).toEqual({ ok: false, reason: "http", status: HTTP_OK });
    });

    it("reports http when the body isn't JSON", async () => {
      respond("<html>bad gateway</html>");

      expect(await sendTelegramMessage(TEXT)).toEqual({ ok: false, reason: "http", status: HTTP_OK });
    });

    // implements FR-9, NFR-1 of add-contact-form
    it("reports timeout when the request times out", async () => {
      fetchMock.mockRejectedValueOnce(new DOMException(`aborted bot${BOT_TOKEN}`, "TimeoutError"));

      const result = await sendTelegramMessage(TEXT);

      expect(result).toEqual({ ok: false, reason: "timeout" });
      expectNoSecret(result);
    });

    // implements FR-9, NFR-1 of add-contact-form
    it("reports network for any other thrown error, without echoing it", async () => {
      fetchMock.mockRejectedValueOnce(new TypeError(`fetch failed: bot${BOT_TOKEN}`));

      const result = await sendTelegramMessage(TEXT);

      expect(result).toEqual({ ok: false, reason: "network" });
      expectNoSecret(result);
    });

    it("never throws when fetch rejects with a non-error value", async () => {
      fetchMock.mockRejectedValueOnce(BOT_TOKEN);

      await expect(sendTelegramMessage(TEXT)).resolves.toEqual({ ok: false, reason: "network" });
    });
  });
});

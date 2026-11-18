// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sendEmail } from "../client";
import { EMAIL_API_URL, EMAIL_ENV, EMAIL_REQUEST_TIMEOUT_MS } from "../email.constants";
import type { EmailSendResult, SendEmailInput } from "../email.types";

const API_KEY = "re_known-Secret_key123";
const FROM = "Poetry Hub <noreply@mail.example.test>";
const RECIPIENT = "reader@private.example.test";
const SUBJECT = "Ваш аккаунт заблокирован";
const BODY = "Стихотворение «Тайное»\n<b>не разметка</b>";
const IDEMPOTENCY_KEY = "violation-warning-1b9d6bcd";
const HTTP_OK = 200;
const HTTP_UNPROCESSABLE = 422;
const HTTP_CONFLICT = 409;
const HTTP_SERVER_ERROR = 503;

const INPUT: SendEmailInput = { to: RECIPIENT, subject: SUBJECT, text: BODY, idempotencyKey: IDEMPOTENCY_KEY };
const SECRETS = [API_KEY, RECIPIENT, BODY];

const fetchMock = vi.fn<typeof fetch>();

function respond(body: string, status = HTTP_OK): void {
  fetchMock.mockResolvedValueOnce(new Response(body, { status }));
}

function expectNoSecret(result: EmailSendResult): void {
  const serialized = JSON.stringify(result);
  for (const secret of SECRETS) expect(serialized).not.toContain(secret);
}

/** Every argument any console method received, flattened to text. */
function loggedText(spies: readonly ReturnType<typeof vi.spyOn>[]): string {
  return JSON.stringify(spies.flatMap((spy) => spy.mock.calls));
}

describe("sendEmail", () => {
  const consoleSpies: ReturnType<typeof vi.spyOn>[] = [];

  beforeEach(() => {
    vi.stubEnv(EMAIL_ENV.apiKey, API_KEY);
    vi.stubEnv(EMAIL_ENV.from, FROM);
    vi.stubGlobal("fetch", fetchMock);
    for (const method of ["log", "info", "warn", "error", "debug"] as const) {
      consoleSpies.push(vi.spyOn(console, method).mockImplementation(() => undefined));
    }
  });

  afterEach(() => {
    fetchMock.mockReset();
    consoleSpies.length = 0;
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  describe("config", () => {
    // implements NFR-1 of admin-violations-feedback
    it.each([
      ["a missing key", EMAIL_ENV.apiKey, undefined],
      ["an empty key", EMAIL_ENV.apiKey, ""],
      ["a key without the prefix", EMAIL_ENV.apiKey, "known-Secret_key123"],
      ["a key with whitespace", EMAIL_ENV.apiKey, "re_two words"],
      ["a missing sender", EMAIL_ENV.from, undefined],
      ["a sender that is not an address", EMAIL_ENV.from, "Poetry Hub"],
      ["a sender with a line break", EMAIL_ENV.from, "noreply@mail.example.test\r\nBcc: x@example.test"],
    ])("fails with reason config and makes no request for %s", async (_case, name, value) => {
      vi.stubEnv(name, value);

      const result = await sendEmail(INPUT);

      expect(result).toEqual({ ok: false, reason: "config" });
      expect(fetchMock).not.toHaveBeenCalled();
      expectNoSecret(result);
    });

    it("accepts a bare address as the sender", async () => {
      vi.stubEnv(EMAIL_ENV.from, "noreply@mail.example.test");
      respond("{}");

      expect(await sendEmail(INPUT)).toEqual({ ok: true });
    });
  });

  describe("request", () => {
    // implements NFR-1, NFR-3 of admin-violations-feedback
    it("POSTs once to the API with the bearer key, the idempotency key, plain text only and a timeout signal", async () => {
      const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
      respond("{}");

      await sendEmail(INPUT);

      expect(timeoutSpy).toHaveBeenCalledWith(EMAIL_REQUEST_TIMEOUT_MS);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0] ?? [];
      expect(url).toBe(EMAIL_API_URL);
      expect(init?.method).toBe("POST");
      expect(init?.headers).toEqual({
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "Idempotency-Key": IDEMPOTENCY_KEY,
      });
      expect(JSON.parse(String(init?.body))).toEqual({
        from: FROM,
        to: [RECIPIENT],
        subject: SUBJECT,
        text: BODY,
      });
      expect(init?.signal).toBe(timeoutSpy.mock.results[0]?.value);
      expect(init?.cache).toBe("no-store");
    });
  });

  describe("result", () => {
    it("is ok when the service accepts the message", async () => {
      respond(JSON.stringify({ id: "49a3999c" }));

      expect(await sendEmail(INPUT)).toEqual({ ok: true });
    });

    // implements NFR-1 of admin-violations-feedback
    it("reports http with the status for a refusal, and nothing logged holds the address or the body", async () => {
      respond(JSON.stringify({ message: `invalid to: ${RECIPIENT}` }), HTTP_UNPROCESSABLE);

      const result = await sendEmail(INPUT);

      expect(result).toEqual({ ok: false, reason: "http", status: HTTP_UNPROCESSABLE });
      expectNoSecret(result);
      const logged = loggedText(consoleSpies);
      for (const secret of SECRETS) expect(logged).not.toContain(secret);
    });

    it("reports http for a server error", async () => {
      respond("", HTTP_SERVER_ERROR);

      expect(await sendEmail(INPUT)).toEqual({ ok: false, reason: "http", status: HTTP_SERVER_ERROR });
    });

    // implements NFR-3 of admin-violations-feedback
    it("reports conflict, not http, for a 409", async () => {
      respond(JSON.stringify({ name: "invalid_idempotent_request" }), HTTP_CONFLICT);

      expect(await sendEmail(INPUT)).toEqual({ ok: false, reason: "conflict" });
    });

    it("reads the body of an error answer, so its connection is released", async () => {
      const response = new Response("{}", { status: HTTP_UNPROCESSABLE });
      fetchMock.mockResolvedValueOnce(response);

      await sendEmail(INPUT);

      expect(response.bodyUsed).toBe(true);
    });

    // implements NFR-3 of admin-violations-feedback
    it("reports timeout when the request times out, without echoing the error", async () => {
      fetchMock.mockRejectedValueOnce(new DOMException(`aborted ${RECIPIENT}`, "TimeoutError"));

      const result = await sendEmail(INPUT);

      expect(result).toEqual({ ok: false, reason: "timeout" });
      expectNoSecret(result);
    });

    it("reports timeout when the timeout fires while the body is being read", async () => {
      const response = new Response(null, { status: HTTP_OK });
      vi.spyOn(response, "text").mockRejectedValueOnce(new DOMException("aborted", "TimeoutError"));
      fetchMock.mockResolvedValueOnce(response);

      expect(await sendEmail(INPUT)).toEqual({ ok: false, reason: "timeout" });
    });

    it("reports network for an abort that isn't the timeout", async () => {
      fetchMock.mockRejectedValueOnce(new DOMException("aborted", "AbortError"));

      expect(await sendEmail(INPUT)).toEqual({ ok: false, reason: "network" });
    });

    // implements NFR-1, NFR-3 of admin-violations-feedback
    it("reports network for any other thrown error, without echoing it", async () => {
      fetchMock.mockRejectedValueOnce(new TypeError(`fetch failed: ${API_KEY} ${RECIPIENT}`));

      const result = await sendEmail(INPUT);

      expect(result).toEqual({ ok: false, reason: "network" });
      expectNoSecret(result);
      const logged = loggedText(consoleSpies);
      for (const secret of SECRETS) expect(logged).not.toContain(secret);
    });

    it("reports network when reading the body fails for another reason", async () => {
      const response = new Response(null, { status: HTTP_OK });
      vi.spyOn(response, "text").mockRejectedValueOnce(new TypeError("terminated"));
      fetchMock.mockResolvedValueOnce(response);

      expect(await sendEmail(INPUT)).toEqual({ ok: false, reason: "network" });
    });

    it("never throws when fetch rejects with a non-error value", async () => {
      fetchMock.mockRejectedValueOnce(API_KEY);

      await expect(sendEmail(INPUT)).resolves.toEqual({ ok: false, reason: "network" });
    });
  });
});

// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { siteConfig } from "@/shared/config/site";
import { sendTelegramMessage, type TelegramSendResult } from "@/shared/lib/telegram";

import { sendContactMessageAction } from "../../actions/contact.actions";
import { HONEYPOT_FIELD } from "../../model/contact.constants";
import { CONTACT_COPY } from "../../model/contact-messages";
import { formatContactMessage } from "../../model/format-contact-message";

vi.mock("@/shared/lib/telegram", () => ({ sendTelegramMessage: vi.fn() }));

const NAME = "Анна Секретова";
const EMAIL = "anna.secret@example.com";
const MESSAGE = "Очень личное сообщение";
const INPUT = { name: NAME, email: EMAIL, message: MESSAGE };
const SUBMITTED_VALUES = [NAME, EMAIL, MESSAGE];
const LOG_LINE = "[contact] send failed";
const HTTP_SERVER_ERROR = 500;

const ACTION_SOURCE = fileURLToPath(new URL("../../actions/contact.actions.ts", import.meta.url));

function loggedText(): string {
  return JSON.stringify(vi.mocked(console.error).mock.calls);
}

function expectNoSubmittedValueLogged() {
  const text = loggedText();
  for (const value of SUBMITTED_VALUES) expect(text).not.toContain(value);
}

describe("sendContactMessageAction", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // implements FR-6, FR-11 of add-contact-form
  it("sends one formatted message and answers sent, with no session set up", async () => {
    vi.mocked(sendTelegramMessage).mockResolvedValue({ ok: true });

    const result = await sendContactMessageAction({ ...INPUT, name: `  ${NAME}  ` });

    expect(result.data).toEqual({ status: "sent" });
    expect(sendTelegramMessage).toHaveBeenCalledTimes(1);
    expect(sendTelegramMessage).toHaveBeenCalledWith(formatContactMessage(INPUT, siteConfig.name));
    expect(console.error).not.toHaveBeenCalled();
  });

  // implements FR-10 of add-contact-form
  it("answers sent for a filled honeypot without sending or logging anything", async () => {
    const result = await sendContactMessageAction({ ...INPUT, [HONEYPOT_FIELD]: "http://spam.example" });

    expect(result.data).toEqual({ status: "sent" });
    expect(sendTelegramMessage).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  // implements FR-9, NFR-2 of add-contact-form
  it.each<[string, TelegramSendResult, Record<string, unknown>]>([
    ["config", { ok: false, reason: "config" }, { reason: "config" }],
    ["network", { ok: false, reason: "network" }, { reason: "network" }],
    ["timeout", { ok: false, reason: "timeout" }, { reason: "timeout" }],
    [
      "http",
      { ok: false, reason: "http", status: HTTP_SERVER_ERROR },
      { reason: "http", status: HTTP_SERVER_ERROR },
    ],
  ])("answers failed and logs one line for a %s failure", async (_reason, sendResult, logged) => {
    vi.mocked(sendTelegramMessage).mockResolvedValue(sendResult);

    const result = await sendContactMessageAction(INPUT);

    expect(result.data).toEqual({ status: "failed" });
    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(LOG_LINE, logged);
    expectNoSubmittedValueLogged();
  });

  // implements FR-5 of add-contact-form
  it("returns validation errors for an invalid email and sends nothing", async () => {
    const result = await sendContactMessageAction({ ...INPUT, email: "not-an-email" });

    expect(result.validationErrors?.fieldErrors.email).toHaveLength(1);
    expect(result.data).toBeUndefined();
    expect(sendTelegramMessage).not.toHaveBeenCalled();
  });

  // implements FR-9, NFR-2 of add-contact-form
  it("answers the generic server error for an unexpected throw, logging no submitted value", async () => {
    vi.mocked(sendTelegramMessage).mockRejectedValue(new Error(`boom for ${NAME} <${EMAIL}>: ${MESSAGE}`));

    const result = await sendContactMessageAction(INPUT);

    expect(result.serverError).toBe(CONTACT_COPY.sendFailed);
    expect(result.data).toBeUndefined();
    expect(console.error).toHaveBeenCalled();
    expectNoSubmittedValueLogged();
  });

  // implements FR-11 of add-contact-form
  it("imports nothing from auth or Supabase", () => {
    const source = readFileSync(ACTION_SOURCE, "utf8");
    // Every module specifier, whether single- or multi-line, relative or aliased.
    const specifiers = [...source.matchAll(/(?:\bfrom|\bimport)\s*["']([^"']+)["']/g)].map((match) => match[1]);

    expect(specifiers).toContain("@/shared/lib/telegram");
    expect(specifiers.filter((specifier) => /auth|supabase/i.test(specifier))).toEqual([]);
  });
});

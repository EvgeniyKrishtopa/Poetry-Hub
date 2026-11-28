// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { siteConfig } from "@/shared/config/site";
import { sendTelegramMessage, type TelegramSendResult } from "@/shared/lib/telegram";
import { verifyTurnstileToken, type TurnstileVerifyResult } from "@/shared/lib/turnstile";

import { sendContactMessageAction } from "../../actions/contact.actions";
import { HONEYPOT_FIELD } from "../../model/contact.constants";
import { CONTACT_COPY } from "../../model/contact-messages";
import { formatContactMessage } from "../../model/format-contact-message";

vi.mock("@/shared/lib/telegram", () => ({ sendTelegramMessage: vi.fn() }));
vi.mock("@/shared/lib/turnstile", () => ({ verifyTurnstileToken: vi.fn() }));

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
    vi.mocked(verifyTurnstileToken).mockResolvedValue({ ok: true });
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

  // implements FR-10 of add-contact-form and FR-6 of pre-deploy-security-hardening
  it.each([
    ["with a token", "captcha-token"],
    ["without one", undefined],
  ])("answers sent for a filled honeypot %s, verifying, sending and logging nothing", async (_case, captchaToken) => {
    const input = { ...INPUT, [HONEYPOT_FIELD]: "http://spam.example", captchaToken };

    const result = await sendContactMessageAction(input);

    expect(result.data).toEqual({ status: "sent" });
    expect(verifyTurnstileToken).not.toHaveBeenCalled();
    expect(sendTelegramMessage).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
  });

  // implements FR-6 of pre-deploy-security-hardening
  it("verifies the token before it sends", async () => {
    vi.mocked(sendTelegramMessage).mockResolvedValue({ ok: true });

    await sendContactMessageAction({ ...INPUT, captchaToken: "captcha-token" });

    expect(verifyTurnstileToken).toHaveBeenCalledExactlyOnceWith("captcha-token");
    expect(sendTelegramMessage).toHaveBeenCalledOnce();
    expect(verifyTurnstileToken).toHaveBeenCalledBefore(vi.mocked(sendTelegramMessage));
  });

  // implements FR-6, NFR-2 of pre-deploy-security-hardening
  it.each<[string, TurnstileVerifyResult]>([
    ["a rejected token", { ok: false, reason: "rejected" }],
    ["a missing secret", { ok: false, reason: "config" }],
    ["an unreachable verifier", { ok: false, reason: "network" }],
    ["a slow verifier", { ok: false, reason: "timeout" }],
  ])("sends nothing for %s, answering failed with one line naming the reason only", async (_case, verdict) => {
    vi.mocked(verifyTurnstileToken).mockResolvedValue(verdict);

    const result = await sendContactMessageAction({ ...INPUT, captchaToken: "captcha-token" });

    expect(result.data).toEqual({ status: "failed" });
    expect(sendTelegramMessage).not.toHaveBeenCalled();
    const reason = verdict.ok ? undefined : verdict.reason;
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[contact] captcha refused", { reason });
    expect(loggedText()).not.toContain("captcha-token");
    expectNoSubmittedValueLogged();
  });

  // implements FR-6 of pre-deploy-security-hardening
  it("asks the verifier about an empty token when the call carries none", async () => {
    vi.mocked(verifyTurnstileToken).mockResolvedValue({ ok: false, reason: "rejected" });

    const result = await sendContactMessageAction(INPUT);

    expect(verifyTurnstileToken).toHaveBeenCalledExactlyOnceWith("");
    expect(result.data).toEqual({ status: "failed" });
    expect(sendTelegramMessage).not.toHaveBeenCalled();
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

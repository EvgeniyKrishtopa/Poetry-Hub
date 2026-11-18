// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sendEmail, type EmailSendResult } from "@/shared/lib/email";

import { sendActionNotice } from "../../actions/send-action-notice";
import { logNotice } from "../../dal/violation-rpc";
import type { SendActionNoticeInput } from "../../model/violation.types";
import { POEM_TITLE, TARGET_EMAIL, TARGET_USER_ID } from "../support/rpc-mock";

vi.mock("@/shared/lib/email", () => ({ sendEmail: vi.fn() }));
vi.mock("../../dal/violation-rpc", () => ({ logNotice: vi.fn() }));

const INPUT: SendActionNoticeInput = {
  kind: "delete-poem",
  userId: TARGET_USER_ID,
  email: TARGET_EMAIL,
  ground: "harmful-content",
  title: POEM_TITLE,
};

const OK: EmailSendResult = { ok: true };
const TIMEOUT: EmailSendResult = { ok: false, reason: "timeout" };

/** NFR-1: the log holds the notice kind and a reason, never the address, the title, the text or the user id. */
function expectNothingSensitiveLogged(): void {
  const logged = vi
    .mocked(console.error)
    .mock.calls.flat()
    .map((part) => (typeof part === "string" ? part : JSON.stringify(part)))
    .join("\n");
  for (const secret of [TARGET_EMAIL, POEM_TITLE, TARGET_USER_ID, "action-notice-"]) {
    expect(logged).not.toContain(secret);
  }
}

describe("sendActionNotice", () => {
  beforeEach(() => {
    vi.mocked(sendEmail).mockResolvedValue(OK);
    vi.mocked(logNotice).mockResolvedValue(undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // implements FR-9 of admin-violations-feedback
  it("sends one email to the address, with the fixed subject and the title in the body, and logs it as sent", async () => {
    const result = await sendActionNotice(INPUT);

    expect(result).toEqual({ outcome: "sent" });
    expect(sendEmail).toHaveBeenCalledExactlyOnceWith({
      to: TARGET_EMAIL,
      subject: expect.not.stringContaining(POEM_TITLE),
      text: expect.stringContaining(POEM_TITLE),
      idempotencyKey: expect.stringMatching(/^action-notice-[0-9a-f-]{36}$/),
    });
    expect(logNotice).toHaveBeenCalledExactlyOnceWith(TARGET_USER_ID, "delete-poem", "sent");
    expect(console.error).not.toHaveBeenCalled();
  });

  // implements FR-14 of admin-violations-feedback
  it("gives each notice its own key", async () => {
    await sendActionNotice(INPUT);
    await sendActionNotice(INPUT);

    const keys = vi.mocked(sendEmail).mock.calls.map(([sent]) => sent.idempotencyKey);
    expect(new Set(keys).size).toBe(2);
  });

  // implements FR-14 of admin-violations-feedback
  it("is a failed send, logged as failed, for an account with no address, and sends nothing", async () => {
    const result = await sendActionNotice({ ...INPUT, email: null });

    expect(result).toEqual({ outcome: "failed", cause: "no-address" });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(logNotice).toHaveBeenCalledExactlyOnceWith(TARGET_USER_ID, "delete-poem", "failed");
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[admin] action notice not sent: delete-poem: no-address");
  });

  // implements FR-14 of admin-violations-feedback
  it.each([
    ["a timeout", TIMEOUT],
    ["a network error", { ok: false, reason: "network" }],
    ["a service answer of 500", { ok: false, reason: "http", status: 500 }],
    ["a service answer of 503", { ok: false, reason: "http", status: 503 }],
    ["a 409 for a request still in progress", { ok: false, reason: "http", status: 409 }],
  ] as const)("retries once, under the same key, after %s, and is sent when the retry succeeds", async (_case, failure) => {
    vi.mocked(sendEmail).mockResolvedValueOnce(failure).mockResolvedValueOnce(OK);

    const result = await sendActionNotice(INPUT);

    expect(result).toEqual({ outcome: "sent" });
    expect(sendEmail).toHaveBeenCalledTimes(2);
    const [first, retry] = vi.mocked(sendEmail).mock.calls.map(([sent]) => sent);
    expect(retry).toEqual(first);
    expect(logNotice).toHaveBeenCalledExactlyOnceWith(TARGET_USER_ID, "delete-poem", "sent");
  });

  // implements FR-14 of admin-violations-feedback
  it("counts a key conflict on the retry as sent: the first request was accepted after all", async () => {
    vi.mocked(sendEmail).mockResolvedValueOnce(TIMEOUT).mockResolvedValueOnce({ ok: false, reason: "conflict" });

    const result = await sendActionNotice(INPUT);

    expect(result).toEqual({ outcome: "sent" });
    expect(logNotice).toHaveBeenCalledExactlyOnceWith(TARGET_USER_ID, "delete-poem", "sent");
  });

  // implements FR-14 of admin-violations-feedback
  it("is failed, not sent, when the retry meets a request still in progress", async () => {
    vi.mocked(sendEmail)
      .mockResolvedValueOnce(TIMEOUT)
      .mockResolvedValueOnce({ ok: false, reason: "http", status: 409 });

    const result = await sendActionNotice(INPUT);

    expect(result).toEqual({ outcome: "failed", cause: "http" });
    expect(logNotice).toHaveBeenCalledExactlyOnceWith(TARGET_USER_ID, "delete-poem", "failed");
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[admin] action notice not sent: delete-poem: http 409");
  });

  // implements FR-14 of admin-violations-feedback
  it("is failed after one retry, never a third attempt, when the retry fails too", async () => {
    vi.mocked(sendEmail).mockResolvedValue(TIMEOUT);

    const result = await sendActionNotice(INPUT);

    expect(result).toEqual({ outcome: "failed", cause: "timeout" });
    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(logNotice).toHaveBeenCalledExactlyOnceWith(TARGET_USER_ID, "delete-poem", "failed");
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[admin] action notice not sent: delete-poem: timeout");
  });

  // implements FR-14 of admin-violations-feedback
  it.each([
    ["config", { ok: false, reason: "config" }, "config"],
    ["a refusal of 422", { ok: false, reason: "http", status: 422 }, "http 422"],
    ["a refusal of 499", { ok: false, reason: "http", status: 499 }, "http 499"],
    ["a conflict on the first send", { ok: false, reason: "conflict" }, "conflict"],
  ] as const)("does not retry after %s", async (_case, failure, logged) => {
    vi.mocked(sendEmail).mockResolvedValue(failure);

    const result = await sendActionNotice(INPUT);

    expect(result).toEqual({ outcome: "failed", cause: failure.reason });
    expect(sendEmail).toHaveBeenCalledOnce();
    expect(logNotice).toHaveBeenCalledExactlyOnceWith(TARGET_USER_ID, "delete-poem", "failed");
    expect(console.error).toHaveBeenCalledExactlyOnceWith(`[admin] action notice not sent: delete-poem: ${logged}`);
  });

  // implements NFR-1 of admin-violations-feedback
  it.each([
    ["a failure", { ok: false, reason: "http", status: 500 }],
    ["a timeout", TIMEOUT],
    ["config", { ok: false, reason: "config" }],
  ] as const)("logs no address, title, user id or key after %s", async (_case, failure) => {
    vi.mocked(sendEmail).mockResolvedValue(failure);

    await sendActionNotice(INPUT);

    expectNothingSensitiveLogged();
  });

  // implements FR-9 of admin-violations-feedback
  it.each([
    ["block", null],
    ["ban", null],
    ["delete-collection", "Осень"],
  ] as const)("logs the kind %s the email belonged to", async (kind, title) => {
    await sendActionNotice({ ...INPUT, kind, title });

    expect(logNotice).toHaveBeenCalledExactlyOnceWith(TARGET_USER_ID, kind, "sent");
  });
});

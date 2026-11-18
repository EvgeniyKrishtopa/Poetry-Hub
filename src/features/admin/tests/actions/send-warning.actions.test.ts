// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getSessionState } from "@/features/auth";
import { sendEmail } from "@/shared/lib/email";

import { sendWarningAction } from "../../actions/send-warning.actions";
import { markWarned, startWarning } from "../../dal/violation-rpc";
import { WARNING_MESSAGE_MAX_LENGTH } from "../../model/violation.constants";
import { ADMIN_USER_ID, CASE_ID, TARGET_EMAIL, TARGET_USER_ID } from "../support/rpc-mock";

vi.mock("@/features/auth", () => ({ getSessionState: vi.fn() }));
vi.mock("@/shared/lib/email", () => ({ sendEmail: vi.fn() }));
vi.mock("../../dal/violation-rpc", () => ({ startWarning: vi.fn(), markWarned: vi.fn() }));

const MESSAGE = "Пожалуйста, уберите последнее стихотворение. Секретная фраза админа.";
const INPUT = { caseId: CASE_ID, message: MESSAGE };
const EXPECTED_KEY = `violation-warning-${CASE_ID}`;

const READY = { ok: true, status: "ready", email: TARGET_EMAIL } as const;

/** Nothing past the validation, the session check or the refusal ran. */
function expectNoEmailAndNoMark(): void {
  expect(sendEmail).not.toHaveBeenCalled();
  expect(markWarned).not.toHaveBeenCalled();
}

/** NFR-1: the log holds the case id and a reason, never the address, the message or the key. */
function expectNothingSensitiveLogged(): void {
  const logged = vi
    .mocked(console.error)
    .mock.calls.flat()
    .map((part) => (typeof part === "string" ? part : JSON.stringify(part)))
    .join("\n");
  for (const secret of [TARGET_EMAIL, MESSAGE, "Секретная фраза", EXPECTED_KEY, TARGET_USER_ID]) {
    expect(logged).not.toContain(secret);
  }
}

describe("sendWarningAction", () => {
  beforeEach(() => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-in", userId: ADMIN_USER_ID });
    vi.mocked(startWarning).mockResolvedValue(READY);
    vi.mocked(sendEmail).mockResolvedValue({ ok: true });
    vi.mocked(markWarned).mockResolvedValue({ ok: true, status: "warned" });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // implements FR-6, FR-11 of admin-violations-feedback
  it("checks the case, sends one email to the database's address under the case's key, then marks the case", async () => {
    const result = await sendWarningAction(INPUT);

    expect(result.data).toEqual({ ok: true });
    expect(startWarning).toHaveBeenCalledExactlyOnceWith({ caseId: CASE_ID });
    expect(sendEmail).toHaveBeenCalledExactlyOnceWith({
      to: TARGET_EMAIL,
      subject: expect.any(String),
      text: expect.stringContaining(MESSAGE),
      idempotencyKey: EXPECTED_KEY,
    });
    expect(markWarned).toHaveBeenCalledExactlyOnceWith({ caseId: CASE_ID });
    expect(vi.mocked(startWarning).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(sendEmail).mock.invocationCallOrder[0] ?? 0,
    );
    expect(vi.mocked(sendEmail).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(markWarned).mock.invocationCallOrder[0] ?? 0,
    );
  });

  // implements FR-6 of admin-violations-feedback
  it("sends the trimmed message in the fixed frame, with a subject that holds none of it", async () => {
    await sendWarningAction({ caseId: CASE_ID, message: `  ${MESSAGE}\n ` });

    const sent = vi.mocked(sendEmail).mock.calls[0]?.[0];
    expect(sent?.text.startsWith(MESSAGE)).toBe(true);
    expect(sent?.subject).not.toContain("стихотворение");
  });

  // implements FR-6 of admin-violations-feedback
  it("never takes the address from the browser", async () => {
    await sendWarningAction({ ...INPUT, email: "attacker@example.com" } as typeof INPUT);

    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: TARGET_EMAIL }));
  });

  // implements FR-11 of admin-violations-feedback
  it("marks the case warned when the service answers an idempotency conflict, and shows no failure", async () => {
    vi.mocked(sendEmail).mockResolvedValue({ ok: false, reason: "conflict" });

    const result = await sendWarningAction(INPUT);

    expect(result.data).toEqual({ ok: true });
    expect(markWarned).toHaveBeenCalledExactlyOnceWith({ caseId: CASE_ID });
  });

  // implements FR-6 of admin-violations-feedback
  it.each([
    ["not-found", "case-not-found"],
    ["wrong-ground", "wrong-ground"],
    ["already-warned", "already-warned"],
    ["already-restricted", "already-restricted"],
    ["no-address", "no-address"],
  ] as const)("sends no email and marks nothing when the checks say %s", async (status, reason) => {
    vi.mocked(startWarning).mockResolvedValue({ ok: true, status });

    const result = await sendWarningAction(INPUT);

    expect(result.data).toEqual({ ok: false, reason });
    expectNoEmailAndNoMark();
  });

  // implements FR-6 of admin-violations-feedback
  it.each([
    ["an empty message", ""],
    ["a whitespace-only message", "  \n\t "],
    ["a message of 2001 characters", "а".repeat(WARNING_MESSAGE_MAX_LENGTH + 1)],
  ])("returns a validation error and does nothing for %s", async (_case, message) => {
    const result = await sendWarningAction({ caseId: CASE_ID, message });

    expect(result.validationErrors).toBeDefined();
    expect(getSessionState).not.toHaveBeenCalled();
    expect(startWarning).not.toHaveBeenCalled();
    expectNoEmailAndNoMark();
  });

  // implements FR-6 of admin-violations-feedback
  it("accepts a message of exactly 2000 characters", async () => {
    const result = await sendWarningAction({ caseId: CASE_ID, message: "а".repeat(WARNING_MESSAGE_MAX_LENGTH) });

    expect(result.data).toEqual({ ok: true });
  });

  // implements FR-15 of admin-violations-feedback
  it.each(["42", "", CASE_ID.toUpperCase()])("returns a validation error and does nothing for the case id %j", async (caseId) => {
    const result = await sendWarningAction({ caseId, message: MESSAGE });

    expect(result.validationErrors).toBeDefined();
    expect(startWarning).not.toHaveBeenCalled();
    expectNoEmailAndNoMark();
  });

  // implements FR-11 of admin-violations-feedback
  it.each([
    ["config", { ok: false, reason: "config" }, false],
    ["a service refusal below 500", { ok: false, reason: "http", status: 422 }, false],
    ["a service answer of 500", { ok: false, reason: "http", status: 500 }, true],
    ["a timeout", { ok: false, reason: "timeout" }, true],
    ["a network error", { ok: false, reason: "network" }, true],
  ] as const)(
    "leaves the case waiting and names the kind for %s, saying whether the outcome is unknown",
    async (_case, failure, outcomeUnknown) => {
      vi.mocked(sendEmail).mockResolvedValue(failure);

      const result = await sendWarningAction(INPUT);

      expect(result.data).toEqual({ ok: false, reason: "email-failed", cause: failure.reason, outcomeUnknown });
      expect(markWarned).not.toHaveBeenCalled();
      expectNothingSensitiveLogged();
    },
  );

  // implements FR-11 of admin-violations-feedback
  it("logs a failed send with the case id and the reason, and no address, message or key", async () => {
    vi.mocked(sendEmail).mockResolvedValue({ ok: false, reason: "http", status: 422 });

    await sendWarningAction(INPUT);

    expect(console.error).toHaveBeenCalledExactlyOnceWith(`[admin] warning email not sent (http 422): case ${CASE_ID}`);
    expectNothingSensitiveLogged();
  });

  // implements FR-11 of admin-violations-feedback
  it("sends under the same key again after a mark that failed, so the retry delivers nothing twice", async () => {
    vi.mocked(markWarned).mockResolvedValueOnce({ ok: false, failure: "unavailable" });

    const first = await sendWarningAction(INPUT);
    const retry = await sendWarningAction(INPUT);

    expect(first.data).toEqual({ ok: false, reason: "unavailable" });
    expect(retry.data).toEqual({ ok: true });
    expect(sendEmail).toHaveBeenCalledTimes(2);
    const keys = vi.mocked(sendEmail).mock.calls.map(([sent]) => sent.idempotencyKey);
    expect(keys).toEqual([EXPECTED_KEY, EXPECTED_KEY]);
  });

  // implements FR-11 of admin-violations-feedback
  it("logs the case id when the email was accepted but the case was not recorded, and no address, message or key", async () => {
    vi.mocked(markWarned).mockResolvedValue({ ok: false, failure: "unavailable" });

    await sendWarningAction(INPUT);

    expect(console.error).toHaveBeenCalledExactlyOnceWith(`[admin] warning email accepted, case not recorded: case ${CASE_ID}`);
    expectNothingSensitiveLogged();
  });

  // implements FR-11 of admin-violations-feedback
  it("sends no second email when the first attempt already marked the case", async () => {
    const first = await sendWarningAction(INPUT);
    vi.mocked(startWarning).mockResolvedValue({ ok: true, status: "already-warned" });
    const retry = await sendWarningAction(INPUT);

    expect(first.data).toEqual({ ok: true });
    expect(retry.data).toEqual({ ok: false, reason: "already-warned" });
    expect(sendEmail).toHaveBeenCalledOnce();
    expect(markWarned).toHaveBeenCalledOnce();
  });

  // implements FR-11 of admin-violations-feedback
  it("tells the admin the case was already warned when another tab marked it between the two steps, without logging a fault", async () => {
    vi.mocked(markWarned).mockResolvedValue({ ok: true, status: "already-warned" });

    const result = await sendWarningAction(INPUT);

    expect(result.data).toEqual({ ok: false, reason: "already-warned" });
    expect(console.error).not.toHaveBeenCalled();
  });

  // implements FR-15 of admin-violations-feedback
  it("says the case is gone when a block in another tab closed it between the two steps", async () => {
    vi.mocked(markWarned).mockResolvedValue({ ok: true, status: "not-found" });

    const result = await sendWarningAction(INPUT);

    expect(result.data).toEqual({ ok: false, reason: "case-not-found" });
  });

  // implements FR-15 of admin-violations-feedback
  it("says the session ended, and does nothing, when the admin is signed out", async () => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "signed-out" });

    const result = await sendWarningAction(INPUT);

    expect(result.data).toEqual({ ok: false, reason: "unauthenticated" });
    expect(startWarning).not.toHaveBeenCalled();
    expectNoEmailAndNoMark();
  });

  // implements FR-15 of admin-violations-feedback
  it("says the service is unavailable, not that the session ended, when the session can't be checked", async () => {
    vi.mocked(getSessionState).mockResolvedValue({ state: "unknown" });

    const result = await sendWarningAction(INPUT);

    expect(result.data).toEqual({ ok: false, reason: "unavailable" });
    expect(startWarning).not.toHaveBeenCalled();
  });

  // implements FR-15 of admin-violations-feedback
  it.each([
    ["a refused admin check", "forbidden", "forbidden"],
    ["an ended session", "unauthenticated", "unauthenticated"],
    ["an outage", "unavailable", "unavailable"],
    ["an unknown failure", "unknown", "unavailable"],
  ] as const)("keeps %s from the checks apart and sends nothing", async (_case, failure, reason) => {
    vi.mocked(startWarning).mockResolvedValue({ ok: false, failure });

    const result = await sendWarningAction(INPUT);

    expect(result.data).toEqual({ ok: false, reason });
    expectNoEmailAndNoMark();
  });

  // implements NFR-1 of admin-violations-feedback
  it("answers an unexpected throw with the generic message and logs the error class only", async () => {
    vi.mocked(sendEmail).mockRejectedValue(new RangeError(`boom for ${TARGET_EMAIL} ${MESSAGE}`));

    const result = await sendWarningAction(INPUT);

    expect(result.serverError).toBeTruthy();
    expect(console.error).toHaveBeenCalledExactlyOnceWith("[admin] action failed: RangeError");
    expectNothingSensitiveLogged();
  });
});

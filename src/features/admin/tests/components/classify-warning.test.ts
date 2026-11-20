import { describe, expect, it } from "vitest";

import { classifyWarning } from "../../components/WarnDialog/classify-warning";
import { CASE_FAILURE_MESSAGES, WARN_DIALOG_COPY } from "../../model/admin-messages";
import type { SendWarningActionResult } from "../../model/violation.types";

const emailFailed = (cause: "config" | "http" | "timeout" | "network", outcomeUnknown: boolean) =>
  ({ ok: false, reason: "email-failed", cause, outcomeUnknown }) satisfies SendWarningActionResult;

describe("classifyWarning", () => {
  // implements FR-6 of admin-violations-feedback
  it("is sent for a success", () => {
    expect(classifyWarning({ ok: true })).toEqual({ kind: "sent" });
  });

  // implements FR-11 of admin-violations-feedback
  it.each([
    ["a timeout", emailFailed("timeout", true)],
    ["a network error", emailFailed("network", true)],
    ["a server error", emailFailed("http", true)],
    ["an answer from the action that says unavailable", { ok: false, reason: "unavailable" } as const],
  ])("fixes the message and says the outcome is unknown after %s", (_case, result) => {
    expect(classifyWarning(result)).toEqual({
      kind: "failed",
      notice: { tone: "neutral", text: WARN_DIALOG_COPY.unknownOutcome },
      locksMessage: true,
    });
  });

  // implements FR-11 of admin-violations-feedback
  it.each([
    ["a missing email config", emailFailed("config", false), WARN_DIALOG_COPY.notConfigured],
    ["a refusal by the email service", emailFailed("http", false), WARN_DIALOG_COPY.notSent],
  ])("leaves the message editable after %s", (_case, result, text) => {
    expect(classifyWarning(result)).toEqual({
      kind: "failed",
      notice: { tone: "danger", text },
      locksMessage: false,
    });
  });

  // implements FR-15 of admin-violations-feedback
  it.each(["already-warned", "wrong-ground", "case-not-found", "already-restricted"] as const)(
    "stops on %s, which is about the case and not the send",
    (reason) => {
      expect(classifyWarning({ ok: false, reason })).toEqual({ kind: "stopped", reason });
    },
  );

  // implements FR-15 of admin-violations-feedback
  it.each(["forbidden", "unauthenticated", "invalid", "target-is-admin", "not-found"] as const)(
    "shows the shared text for %s and leaves the message editable",
    (reason) => {
      expect(classifyWarning({ ok: false, reason })).toEqual({
        kind: "failed",
        notice: { tone: "danger", text: CASE_FAILURE_MESSAGES[reason] },
        locksMessage: false,
      });
    },
  );

  // implements FR-6 of admin-violations-feedback
  it("says there is no address for a user with none", () => {
    expect(classifyWarning({ ok: false, reason: "no-address" })).toEqual({
      kind: "failed",
      notice: { tone: "danger", text: WARN_DIALOG_COPY.noAddress },
      locksMessage: false,
    });
  });

  // implements FR-15 of admin-violations-feedback
  it("reads content that is gone, which a warning never records, as an invalid request", () => {
    expect(classifyWarning({ ok: false, reason: "content-not-found" })).toMatchObject({
      kind: "failed",
      notice: { text: CASE_FAILURE_MESSAGES.invalid },
    });
  });
});

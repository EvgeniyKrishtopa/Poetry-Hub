import { describe, expect, it } from "vitest";

import {
  ADD_CASE_RESULT_MESSAGES,
  CASE_FAILURE_MESSAGES,
  CONTENT_GONE_MESSAGES,
  MODERATION_RESULT_MESSAGES,
  NOTICE_RESULT_SUFFIX,
} from "../../model/admin-messages";
import { caseFailureMessage, describeAddResult, describeModerationSuccess } from "../../model/case-notices";
import type { CaseFailureReason } from "../../model/violation.types";

const REASONS_WITH_A_TEXT = [
  "already-restricted",
  "target-is-admin",
  "not-found",
  "case-not-found",
  "forbidden",
  "unauthenticated",
  "unavailable",
  "invalid",
] as const satisfies readonly CaseFailureReason[];

describe("caseFailureMessage", () => {
  // implements FR-15 of admin-violations-feedback
  it.each(REASONS_WITH_A_TEXT)("has its own text for %s, whatever the content", (reason) => {
    expect(caseFailureMessage(reason, null)).toBe(CASE_FAILURE_MESSAGES[reason]);
    expect(caseFailureMessage(reason, "poem")).toBe(CASE_FAILURE_MESSAGES[reason]);
  });

  // implements FR-15 of admin-violations-feedback
  it("keeps a missing case, a deleted account and a blocked user apart in what it says", () => {
    const texts = new Set([
      caseFailureMessage("case-not-found", null),
      caseFailureMessage("already-restricted", null),
      caseFailureMessage("not-found", null),
    ]);

    expect(texts.size).toBe(3);
  });

  // implements FR-15 of admin-violations-feedback
  it.each([
    ["poem", CONTENT_GONE_MESSAGES.poem],
    ["collection", CONTENT_GONE_MESSAGES.collection],
  ] as const)("words a deleted %s by its kind", (kind, text) => {
    expect(caseFailureMessage("content-not-found", kind)).toBe(text);
  });

  // implements FR-15 of admin-violations-feedback
  it("reads content that is gone with no kind to name as an invalid request", () => {
    expect(caseFailureMessage("content-not-found", null)).toBe(CASE_FAILURE_MESSAGES.invalid);
  });
});

describe("describeAddResult", () => {
  // implements FR-1 of admin-violations-feedback
  it("is a success line for an added user", () => {
    expect(describeAddResult({ ok: true, status: "added" }, null)).toEqual({
      tone: "success",
      text: ADD_CASE_RESULT_MESSAGES.added,
    });
  });

  // implements FR-2 of admin-violations-feedback
  it("is a neutral line for a user already on the list", () => {
    expect(describeAddResult({ ok: true, status: "already-in-list" }, null)).toEqual({
      tone: "neutral",
      text: ADD_CASE_RESULT_MESSAGES["already-in-list"],
    });
  });

  // implements FR-15 of admin-violations-feedback
  it("is a danger line for a failure, worded by the content kind when it is the content that is gone", () => {
    expect(describeAddResult({ ok: false, reason: "content-not-found" }, "collection")).toEqual({
      tone: "danger",
      text: CONTENT_GONE_MESSAGES.collection,
    });
    expect(describeAddResult({ ok: false, reason: "target-is-admin" }, null)).toEqual({
      tone: "danger",
      text: CASE_FAILURE_MESSAGES["target-is-admin"],
    });
  });
});

describe("describeModerationSuccess", () => {
  // implements FR-9 of admin-violations-feedback
  it.each([
    ["blocked", MODERATION_RESULT_MESSAGES.blocked],
    ["banned", MODERATION_RESULT_MESSAGES.banned],
  ] as const)("adds that the email went out after a %s", (status, base) => {
    expect(describeModerationSuccess({ ok: true, status, notice: { outcome: "sent" } })).toEqual({
      tone: "success",
      text: `${base}${NOTICE_RESULT_SUFFIX.sent}`,
    });
  });

  // implements FR-14 of admin-violations-feedback
  it.each([
    ["timeout", NOTICE_RESULT_SUFFIX.failed],
    ["config", NOTICE_RESULT_SUFFIX.failed],
    ["unexpected", NOTICE_RESULT_SUFFIX.failed],
    ["no-address", NOTICE_RESULT_SUFFIX.noAddress],
  ] as const)("says the email was not sent when the notice failed with %s", (cause, suffix) => {
    expect(
      describeModerationSuccess({ ok: true, status: "blocked", notice: { outcome: "failed", cause } }),
    ).toEqual({ tone: "neutral", text: `${MODERATION_RESULT_MESSAGES.blocked}${suffix}` });
  });

  // implements FR-14 of admin-violations-feedback
  it("adds nothing when the notice step was skipped", () => {
    expect(describeModerationSuccess({ ok: true, status: "banned", notice: { outcome: "skipped" } })).toEqual({
      tone: "success",
      text: MODERATION_RESULT_MESSAGES.banned,
    });
  });

  // implements FR-9 of admin-violations-feedback
  it.each([
    ["unblocked", "success", MODERATION_RESULT_MESSAGES.unblocked],
    ["revoked", "success", MODERATION_RESULT_MESSAGES.revoked],
    ["no-sessions", "neutral", MODERATION_RESULT_MESSAGES["no-sessions"]],
  ] as const)("keeps the plain line for %s, which sends no email", (status, tone, text) => {
    expect(describeModerationSuccess({ ok: true, status })).toEqual({ tone, text });
  });
});

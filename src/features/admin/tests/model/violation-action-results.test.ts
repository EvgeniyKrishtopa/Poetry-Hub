import { describe, expect, it } from "vitest";

import {
  toAddCaseActionResult,
  toMarkWarnedActionResult,
  toRemoveCaseActionResult,
  toSetCaseGroundActionResult,
  toWarningRefusal,
} from "../../model/violation-action-results";
import type { ViolationDbStatus } from "../../model/violation.types";

const FAILURES = [
  ["forbidden", "forbidden"],
  ["unauthenticated", "unauthenticated"],
  ["unavailable", "unavailable"],
  ["unknown", "unavailable"],
] as const;

describe("toAddCaseActionResult", () => {
  // implements FR-1, FR-2 of admin-violations-feedback
  it.each([
    ["added", { ok: true, status: "added" }],
    ["already-in-list", { ok: true, status: "already-in-list" }],
    ["target-is-admin", { ok: false, reason: "target-is-admin" }],
    ["already-restricted", { ok: false, reason: "already-restricted" }],
    ["not-found", { ok: false, reason: "not-found" }],
    ["content-not-found", { ok: false, reason: "content-not-found" }],
  ] as const)("reads the answer %s", (status, expected) => {
    expect(toAddCaseActionResult({ ok: true, status })).toEqual(expected);
  });

  // implements FR-15 of admin-violations-feedback
  it.each(FAILURES)("keeps the failure %s as %s", (failure, reason) => {
    expect(toAddCaseActionResult({ ok: false, failure })).toEqual({ ok: false, reason });
  });

  // implements FR-15 of admin-violations-feedback
  it("keeps a missing user and missing content apart", () => {
    expect(toAddCaseActionResult({ ok: true, status: "not-found" })).not.toEqual(
      toAddCaseActionResult({ ok: true, status: "content-not-found" }),
    );
  });

  // implements FR-15 of admin-violations-feedback
  it.each(["removed", "ready", "warned", "ground-changed"] as const satisfies readonly ViolationDbStatus[])(
    "reads the status %s, which the add function never gives, as an outage and never as success",
    (status) => {
      expect(toAddCaseActionResult({ ok: true, status })).toEqual({ ok: false, reason: "unavailable" });
    },
  );
});

describe("toSetCaseGroundActionResult", () => {
  // implements FR-7 of admin-violations-feedback
  it("is a success for ground-changed", () => {
    expect(toSetCaseGroundActionResult({ ok: true, status: "ground-changed" })).toEqual({ ok: true });
  });

  // implements FR-7, FR-15 of admin-violations-feedback
  it("says the case is gone for not-found, not that the user is", () => {
    expect(toSetCaseGroundActionResult({ ok: true, status: "not-found" })).toEqual({
      ok: false,
      reason: "case-not-found",
    });
  });

  // implements FR-15 of admin-violations-feedback
  it.each(FAILURES)("keeps the failure %s as %s", (failure, reason) => {
    expect(toSetCaseGroundActionResult({ ok: false, failure })).toEqual({ ok: false, reason });
  });

  // implements FR-15 of admin-violations-feedback
  it("reads a status outside its contract as an outage", () => {
    expect(toSetCaseGroundActionResult({ ok: true, status: "added" })).toEqual({ ok: false, reason: "unavailable" });
  });
});

describe("toRemoveCaseActionResult", () => {
  // implements FR-7 of admin-violations-feedback
  it("is a success for removed", () => {
    expect(toRemoveCaseActionResult({ ok: true, status: "removed" })).toEqual({ ok: true });
  });

  // implements FR-7, FR-15 of admin-violations-feedback
  it("says the case is gone for not-found", () => {
    expect(toRemoveCaseActionResult({ ok: true, status: "not-found" })).toEqual({
      ok: false,
      reason: "case-not-found",
    });
  });

  // implements FR-15 of admin-violations-feedback
  it.each(FAILURES)("keeps the failure %s as %s", (failure, reason) => {
    expect(toRemoveCaseActionResult({ ok: false, failure })).toEqual({ ok: false, reason });
  });

  // implements FR-15 of admin-violations-feedback
  it("reads a status outside its contract as an outage", () => {
    expect(toRemoveCaseActionResult({ ok: true, status: "warned" })).toEqual({ ok: false, reason: "unavailable" });
  });
});

describe("toWarningRefusal", () => {
  // implements FR-6 of admin-violations-feedback
  it.each([
    ["not-found", "case-not-found"],
    ["wrong-ground", "wrong-ground"],
    ["already-warned", "already-warned"],
    ["already-restricted", "already-restricted"],
    ["no-address", "no-address"],
  ] as const)("reads the answer %s as the refusal %s", (status, reason) => {
    expect(toWarningRefusal(status)).toEqual({ ok: false, reason });
  });

  // implements FR-6 of admin-violations-feedback
  it("reads a status outside its contract as an outage", () => {
    expect(toWarningRefusal("added")).toEqual({ ok: false, reason: "unavailable" });
  });
});

describe("toMarkWarnedActionResult", () => {
  // implements FR-11 of admin-violations-feedback
  it("is a success for warned", () => {
    expect(toMarkWarnedActionResult({ ok: true, status: "warned" })).toEqual({ ok: true });
  });

  // implements FR-11 of admin-violations-feedback
  it("tells the admin the case was already warned, so the deadline is the first one", () => {
    expect(toMarkWarnedActionResult({ ok: true, status: "already-warned" })).toEqual({
      ok: false,
      reason: "already-warned",
    });
  });

  // implements FR-15 of admin-violations-feedback
  it("says the case is gone for not-found", () => {
    expect(toMarkWarnedActionResult({ ok: true, status: "not-found" })).toEqual({
      ok: false,
      reason: "case-not-found",
    });
  });

  // implements FR-15 of admin-violations-feedback
  it.each(FAILURES)("keeps the failure %s as %s", (failure, reason) => {
    expect(toMarkWarnedActionResult({ ok: false, failure })).toEqual({ ok: false, reason });
  });
});

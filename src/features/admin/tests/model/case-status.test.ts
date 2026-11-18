import { describe, expect, it } from "vitest";

import { deriveCaseDeadline, deriveCaseStatus } from "../../model/case-status";
import { WARNING_PERIOD_MS } from "../../model/violation.constants";

const WARNED_AT = "2026-11-17T10:00:00.000Z";
const WARNED_AT_MS = new Date(WARNED_AT).getTime();

/** The current time `offsetMs` after the warning. */
function nowAfter(offsetMs: number): Date {
  return new Date(WARNED_AT_MS + offsetMs);
}

const ONE_HOUR_MS = 3_600_000;
const ONE_MS = 1;

describe("deriveCaseStatus", () => {
  // implements FR-5 of admin-violations-feedback
  it("is waiting when no warning was sent, whatever the time", () => {
    expect(deriveCaseStatus(null, new Date("2026-11-17T10:00:00.000Z"))).toBe("waiting");
  });

  // implements FR-5 of admin-violations-feedback
  it("is warned two hours after the warning", () => {
    expect(deriveCaseStatus(WARNED_AT, nowAfter(2 * ONE_HOUR_MS))).toBe("warned");
  });

  // implements FR-5 of admin-violations-feedback
  it("is warned at the instant of the warning and until the last millisecond before 24 hours", () => {
    expect(deriveCaseStatus(WARNED_AT, nowAfter(0))).toBe("warned");
    expect(deriveCaseStatus(WARNED_AT, nowAfter(WARNING_PERIOD_MS - ONE_MS))).toBe("warned");
  });

  // implements FR-5 of admin-violations-feedback
  it("is deadline-passed at exactly 24 hours, as the spec says 24 hours ago or more", () => {
    expect(deriveCaseStatus(WARNED_AT, nowAfter(WARNING_PERIOD_MS))).toBe("deadline-passed");
  });

  // implements FR-5 of admin-violations-feedback
  it("is deadline-passed 25 hours after the warning", () => {
    expect(deriveCaseStatus(WARNED_AT, nowAfter(25 * ONE_HOUR_MS))).toBe("deadline-passed");
  });
});

describe("deriveCaseDeadline", () => {
  // implements FR-5 of admin-violations-feedback
  it("is the warning's time plus 24 hours as an ISO timestamp", () => {
    expect(deriveCaseDeadline(WARNED_AT)).toBe("2026-11-18T10:00:00.000Z");
  });

  // implements FR-5 of admin-violations-feedback
  it("reads a timestamp with an offset, as the database prints it", () => {
    expect(deriveCaseDeadline("2026-11-17T12:30:00.123456+02:00")).toBe("2026-11-18T10:30:00.123Z");
  });
});

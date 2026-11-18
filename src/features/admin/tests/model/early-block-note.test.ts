import { describe, expect, it } from "vitest";

import { EARLY_BLOCK_COPY } from "../../model/admin-messages";
import { earlyBlockNoteOf, earlyBlockNoteText } from "../../model/early-block-note";
import { formatAdminDateTime } from "../../model/format-admin-date";

const WARNED_AT = "2026-11-17T15:40:00.000Z";
const DEADLINE = "2026-11-18T15:40:00.000Z";

describe("earlyBlockNoteOf", () => {
  // implements FR-8 of admin-violations-feedback
  it("says no warning was sent for a harmful-content case still waiting", () => {
    expect(earlyBlockNoteOf("harmful-content", "waiting", null)).toEqual({ kind: "not-warned" });
  });

  // implements FR-8 of admin-violations-feedback
  it("carries the deadline for a harmful-content case whose period is running", () => {
    expect(earlyBlockNoteOf("harmful-content", "warned", WARNED_AT)).toEqual({
      kind: "deadline-open",
      deadlineIso: DEADLINE,
    });
  });

  // implements FR-8 of admin-violations-feedback
  it("has no note once the deadline passed", () => {
    expect(earlyBlockNoteOf("harmful-content", "deadline-passed", WARNED_AT)).toBeNull();
  });

  // implements FR-8 of admin-violations-feedback
  it.each(["waiting", "warned", "deadline-passed"] as const)(
    "has no note for malicious activity, which has no warning step (%s)",
    (status) => {
      expect(earlyBlockNoteOf("malicious-activity", status, status === "waiting" ? null : WARNED_AT)).toBeNull();
    },
  );
});

describe("earlyBlockNoteText", () => {
  // implements FR-8 of admin-violations-feedback
  it("is the no-warning line for an unwarned case", () => {
    expect(earlyBlockNoteText({ kind: "not-warned" })).toBe(EARLY_BLOCK_COPY.notWarned);
  });

  // implements FR-8 of admin-violations-feedback
  it("names the deadline in UTC for a case whose period is running", () => {
    const text = earlyBlockNoteText({ kind: "deadline-open", deadlineIso: DEADLINE });

    expect(text).toBe(EARLY_BLOCK_COPY.deadlineOpen(formatAdminDateTime(DEADLINE)));
    expect(text).toContain("UTC");
  });
});

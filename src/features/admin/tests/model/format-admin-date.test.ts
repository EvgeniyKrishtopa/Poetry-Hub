import { describe, expect, it } from "vitest";

import { formatAdminDate, formatAdminDateTime } from "../../model/format-admin-date";

describe("formatAdminDate", () => {
  // implements FR-3 of admin-moderation
  it("prints the UTC day in Russian, whatever the machine's time zone", () => {
    expect(formatAdminDate("2026-11-12T23:30:00.123456+00:00")).toBe("12 ноября 2026 г.");
  });
});

describe("formatAdminDateTime", () => {
  // implements FR-5 of admin-violations-feedback
  it("prints the UTC date and time and labels it UTC, whatever the machine's time zone", () => {
    expect(formatAdminDateTime("2026-11-12T23:30:00.123456+00:00")).toBe("12 ноября 2026 г., 23:30 UTC");
  });

  // implements FR-5 of admin-violations-feedback
  it("prints midnight as 00:00, not 24:00", () => {
    expect(formatAdminDateTime("2026-11-13T00:05:00Z")).toBe("13 ноября 2026 г., 00:05 UTC");
  });

  // implements FR-5 of admin-violations-feedback
  it("converts an offset to UTC", () => {
    expect(formatAdminDateTime("2026-11-12T01:30:00+03:00")).toBe("11 ноября 2026 г., 22:30 UTC");
  });
});

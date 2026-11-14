import { describe, expect, it } from "vitest";

import { formatAdminDate } from "../../model/format-admin-date";

describe("formatAdminDate", () => {
  // implements FR-3 of admin-moderation
  it("prints the UTC day in Russian, whatever the machine's time zone", () => {
    expect(formatAdminDate("2026-11-12T23:30:00.123456+00:00")).toBe("12 ноября 2026 г.");
  });
});

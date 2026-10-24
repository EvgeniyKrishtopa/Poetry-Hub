import { afterEach, describe, expect, it } from "vitest";

import { formatPublishedDate } from "../../model/format-published-date";

const ORIGINAL_TZ = process.env.TZ;

describe("formatPublishedDate", () => {
  afterEach(() => {
    process.env.TZ = ORIGINAL_TZ;
  });

  // implements FR-4 of add-author-poems
  it("formats an ISO date in Russian long form", () => {
    expect(formatPublishedDate("2026-03-12")).toBe("12 марта 2026 г.");
  });

  // implements FR-4 of add-author-poems
  it("keeps the day when the server's time zone is behind UTC", () => {
    process.env.TZ = "America/New_York";

    expect(formatPublishedDate("2026-01-01")).toBe("1 января 2026 г.");
  });
});

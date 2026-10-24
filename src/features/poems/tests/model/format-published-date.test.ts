import { afterEach, describe, expect, it, vi } from "vitest";

import { formatPublishedDate } from "../../model/format-published-date";

/** A zone behind UTC: midnight UTC on 1 January is still 31 December there. */
const ZONE_BEHIND_UTC = "America/New_York";

describe("formatPublishedDate", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // implements FR-4 of add-author-poems
  it("formats an ISO date in Russian long form", () => {
    expect(formatPublishedDate("2026-03-12")).toBe("12 марта 2026 г.");
  });

  // implements FR-4 of add-author-poems
  it("keeps the day when the server's time zone is behind UTC", async () => {
    // The formatter is built when its module loads, so the zone must be set before a fresh import.
    vi.stubEnv("TZ", ZONE_BEHIND_UTC);
    vi.resetModules();
    const { formatPublishedDate: formatInZoneBehindUtc } = await import("../../model/format-published-date");

    expect(formatInZoneBehindUtc("2026-01-01")).toBe("1 января 2026 г.");
  });
});

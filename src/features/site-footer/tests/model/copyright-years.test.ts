import { describe, expect, it } from "vitest";

import { formatCopyrightYears } from "../../model/copyright-years";

describe("formatCopyrightYears", () => {
  // implements FR-2 of add-site-footer
  it("returns the founding year alone in the founding year", () => {
    expect(formatCopyrightYears(2026, 2026)).toBe("2026");
  });

  // implements FR-2 of add-site-footer
  it("joins the founding and current year with an en dash and no spaces", () => {
    expect(formatCopyrightYears(2026, 2027)).toBe("2026–2027");
    expect(formatCopyrightYears(2026, 2030)).toBe("2026–2030");
  });

  it("never returns a backwards range when the clock is before the founding year", () => {
    expect(formatCopyrightYears(2026, 2025)).toBe("2026");
  });
});

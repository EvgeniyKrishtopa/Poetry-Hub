import { describe, expect, it } from "vitest";

import { adminListHref } from "../../model/list-href";
import { parseListCursor } from "../../model/list-cursor";

const CURSOR = "2026-11-13T17:15:29.123456+00:00_2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d";

describe("adminListHref", () => {
  // implements FR-3 of admin-moderation
  it("is the bare path with no cursor", () => {
    expect(adminListHref({})).toBe("/admin");
  });

  // implements FR-3 of admin-moderation
  it("carries a cursor that parses back, its plus sign encoded", () => {
    const href = adminListHref({ after: CURSOR });
    const params = new URL(href, "https://example.test").searchParams;

    expect(href).toContain("%2B");
    expect(parseListCursor(params.get("after") ?? undefined)).not.toBeNull();
  });

  // implements FR-3 of admin-violations-feedback
  it("never carries an email filter", () => {
    expect(adminListHref({ after: CURSOR })).not.toContain("email");
  });
});

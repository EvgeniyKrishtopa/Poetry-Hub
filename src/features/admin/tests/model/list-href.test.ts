import { describe, expect, it } from "vitest";

import { adminListHref } from "../../model/list-href";
import { parseListCursor } from "../../model/list-cursor";

const CURSOR = "2026-11-13T17:15:29.123456+00:00_2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d";

describe("adminListHref", () => {
  // implements FR-3 of admin-moderation
  it("is the bare path with no cursor and no filter, and ignores a blank filter", () => {
    expect(adminListHref({})).toBe("/admin");
    expect(adminListHref({ email: "   " })).toBe("/admin");
  });

  // implements FR-3 of admin-moderation
  it("carries the filter and a cursor that parses back, its plus sign encoded", () => {
    const href = adminListHref({ after: CURSOR, email: "a@b.co" });
    const params = new URL(href, "https://example.test").searchParams;

    expect(href).toContain("%2B");
    expect(params.get("email")).toBe("a@b.co");
    expect(parseListCursor(params.get("after") ?? undefined)).not.toBeNull();
  });
});

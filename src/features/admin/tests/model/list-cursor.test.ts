import { describe, expect, it } from "vitest";

import { formatListCursor, parseListCursor } from "../../model/list-cursor";

const CREATED_AT = "2026-11-13T17:15:29.123456+00:00";
const USER_ID = "2b3c4d5e-6f70-4a1b-9c2d-3e4f5a6b7c8d";

describe("list cursor", () => {
  // implements FR-3 of admin-moderation
  it("round-trips a row's timestamp and id, keeping the microseconds the database wrote", () => {
    const after = formatListCursor({ createdAt: CREATED_AT, id: USER_ID });

    expect(after).toBe(`${CREATED_AT}_${USER_ID}`);
    expect(parseListCursor(after)).toEqual({ createdAt: CREATED_AT, id: USER_ID });
  });

  // implements FR-3 of admin-moderation
  it("survives a URL whose offset plus was percent-encoded", () => {
    const query = new URLSearchParams({ after: formatListCursor({ createdAt: CREATED_AT, id: USER_ID }) });
    const url = new URL(`https://example.test/admin?${query.toString()}`);

    expect(query.toString()).toContain("%2B");
    expect(parseListCursor(url.searchParams.get("after") ?? undefined)).toEqual({ createdAt: CREATED_AT, id: USER_ID });
  });

  // implements FR-3 of admin-moderation
  it("survives a URL whose offset plus was not encoded, and so was read back as a space", () => {
    const url = new URL(`https://example.test/admin?after=${CREATED_AT}_${USER_ID}`);

    expect(url.searchParams.get("after")).toContain(" 00:00");
    expect(parseListCursor(url.searchParams.get("after") ?? undefined)).toEqual({
      createdAt: CREATED_AT,
      id: USER_ID,
    });
  });

  // implements FR-3 of admin-moderation
  it("is no cursor, so the first page, when the parameter is absent", () => {
    expect(parseListCursor(undefined)).toBeNull();
  });

  // implements FR-3 of admin-moderation
  it.each([
    ["empty", ""],
    ["no separator", "garbage"],
    ["only the timestamp", `${CREATED_AT}_`],
    ["only the id", `_${USER_ID}`],
    ["a timestamp without an offset", `2026-11-13T17:15:29_${USER_ID}`],
    ["not a timestamp", `yesterday_${USER_ID}`],
    ["not an id", `${CREATED_AT}_42`],
    ["an uppercase id", `${CREATED_AT}_${USER_ID.toUpperCase()}`],
  ])("is no cursor for a hand-edited value: %s", (_case, after) => {
    expect(parseListCursor(after)).toBeNull();
  });
});

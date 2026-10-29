// @vitest-environment node
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const SEED_FILE = "supabase/seed.sql";

/**
 * One public reader line of the seed: `('<email>', '<user id>', '<profile id>', '<first name>', …`.
 * A quoted first name marks the profile public; the draft reader's line has `null` there and no match.
 */
const PUBLIC_READER_LINE =
  /\('([^']+@example\.test)',\s*'[0-9a-f-]{36}',\s*'([0-9a-f-]{36})',\s*'/g;

/** The draft reader's line: an email, two ids, and no first name, so the profile stays private. */
const DRAFT_READER_LINE =
  /\('draft-author@example\.test',\s*'[0-9a-f-]{36}',\s*'[0-9a-f-]{36}',\s*null,/;

// Each reader's poem count (0..4) is pinned by seed-poems.test.ts against the seeded poem rows.
const PUBLIC_READER_EMAILS: readonly string[] = [
  "author1@example.test",
  "author2@example.test",
  "author3@example.test",
  "author4@example.test",
  "author5@example.test",
];

/** Public profile id per email, read from the seed file. */
function publicProfileIds(): Map<string, string> {
  const seed = readFileSync(SEED_FILE, "utf8");
  return new Map(Array.from(seed.matchAll(PUBLIC_READER_LINE), ([, email, id]) => [email, id]));
}

describe("supabase/seed.sql", () => {
  // implements FR-8 of refine-author-page-and-contact
  it("seeds exactly the five public readers", () => {
    expect([...publicProfileIds().keys()].sort()).toEqual(PUBLIC_READER_EMAILS);
  });

  // implements FR-8 of refine-author-page-and-contact
  it("seeds the draft reader with no first name, so the profile is not public", () => {
    expect(readFileSync(SEED_FILE, "utf8")).toMatch(DRAFT_READER_LINE);
  });
});

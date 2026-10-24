// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { MOCK_POEMS } from "../../dal/mock-poems";

const MOCK_POEM_TOTAL = 4;
/** The change's date: no mock poem may be published after it. */
const LATEST_PUBLISHED_AT = "2026-10-24";
const LOWERCASE_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const PUBLIC_DIR = "public";

describe("mock poems", () => {
  // implements FR-7 of add-author-poems
  it("holds four poems with unique lowercase-slug ids", () => {
    const ids = MOCK_POEMS.map(({ id }) => id);

    expect(MOCK_POEMS).toHaveLength(MOCK_POEM_TOTAL);
    expect(new Set(ids).size).toBe(MOCK_POEM_TOTAL);
    for (const id of ids) expect(id).toMatch(LOWERCASE_SLUG);
  });

  // implements FR-7 of add-author-poems
  it.each(MOCK_POEMS.map((poem) => [poem.id, poem] as const))("%s has a valid, past ISO date", (_id, poem) => {
    expect(poem.publishedAt).toMatch(ISO_DATE);
    expect(new Date(`${poem.publishedAt}T00:00:00Z`).toISOString().startsWith(poem.publishedAt)).toBe(true);
    expect(poem.publishedAt <= LATEST_PUBLISHED_AT).toBe(true);
  });

  // implements FR-7 of add-author-poems
  it.each(MOCK_POEMS.map((poem) => [poem.id, poem] as const))(
    "%s has an existing illustration with no script",
    (_id, poem) => {
      const file = join(PUBLIC_DIR, poem.illustrationSrc);

      expect(existsSync(file), file).toBe(true);
      expect(readFileSync(file, "utf8")).not.toMatch(/<script/i);
    },
  );
});

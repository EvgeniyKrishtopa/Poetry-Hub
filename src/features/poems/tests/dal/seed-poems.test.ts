// @vitest-environment node
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const SEED_FILE = "supabase/seed.sql";

/** One assignment line of the seed: `('<poem id>', 'author<N>@example.test', <position>)`. */
const ASSIGNMENT_LINE = /\('([0-9a-f-]{36})',\s*'author(\d)@example\.test',\s*(\d+)\)/g;

/** One poem line of the seed's poem set: `(<position>, '<title>', $$`. */
const POEM_LINE = /^\s*\((\d+), '[^']+', \$\$/gm;

/** authorN's poem M has this id, so a recorded scenario can open it by URL (design D12). */
function seedPoemId(authorNumber: number, position: number): string {
  return `30000000-0000-4000-8000-0000000000${authorNumber}${position}`;
}

const SEEDED_POEM_SET_SIZE = 4;
const SEEDED_POEM_COUNT = 10;
const AUTHOR_NUMBERS = [1, 2, 3, 4, 5] as const;

interface Assignment {
  readonly poemId: string;
  readonly authorNumber: number;
  readonly position: number;
}

function readSeed(): string {
  return readFileSync(SEED_FILE, "utf8");
}

function assignments(): Assignment[] {
  return Array.from(readSeed().matchAll(ASSIGNMENT_LINE), ([, poemId, author, position]) => ({
    poemId,
    authorNumber: Number(author),
    position: Number(position),
  }));
}

describe("supabase/seed.sql poems", () => {
  // implements FR-14 of add-poem-creation
  it("defines the four former mock poems at positions 1 to 4", () => {
    const positions = Array.from(readSeed().matchAll(POEM_LINE), ([, position]) => Number(position));
    expect(positions).toEqual(Array.from({ length: SEEDED_POEM_SET_SIZE }, (_, i) => i + 1));
  });

  // implements FR-14 of add-poem-creation
  it("seeds ten poems in all", () => {
    expect(assignments()).toHaveLength(SEEDED_POEM_COUNT);
  });

  // implements FR-14 of add-poem-creation
  it.each(AUTHOR_NUMBERS)("gives author%i the first N - 1 poems, each with its fixed id", (authorNumber) => {
    const own = assignments().filter((a) => a.authorNumber === authorNumber);
    const expectedPositions = Array.from({ length: authorNumber - 1 }, (_, i) => i + 1);

    expect(own.map((a) => a.position)).toEqual(expectedPositions);
    expect(own.map((a) => a.poemId)).toEqual(expectedPositions.map((p) => seedPoemId(authorNumber, p)));
  });
});

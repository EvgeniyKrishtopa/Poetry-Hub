import "server-only";

import { cache } from "react";

import { comparePoems } from "../model/compare-poems";
import type { AuthorPoemResult, Poem } from "../model/poem.types";

import { mockPoemCount } from "./mock-poem-count";
import { MOCK_POEMS } from "./mock-poems";

// The only reader of the mock set (NFR-3): a database read replaces this module's bodies, and the
// signatures stay. Neither function checks the author id; callers check the author first (design D4).

/** The author's poems, newest first: the first N of the mock set, N from the author's id (design D2). */
export async function listAuthorPoems(authorId: string): Promise<readonly Poem[]> {
  return MOCK_POEMS.slice(0, mockPoemCount(authorId)).sort(comparePoems);
}

/**
 * One poem of the author, by exact, case-sensitive id. Memoized per request, so a page and its
 * breadcrumb trail share one result (design D12).
 */
export const getAuthorPoem = cache(async (authorId: string, poemId: string): Promise<AuthorPoemResult> => {
  const poems = await listAuthorPoems(authorId);
  const poem = poems.find((candidate) => candidate.id === poemId);
  if (poem === undefined) return { ok: false, reason: "not-found" };
  return { ok: true, poem };
});

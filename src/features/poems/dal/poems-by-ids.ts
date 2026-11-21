import "server-only";

import type { PoemSummariesResult } from "../model/poem-summary.types";

/**
 * The public poems with these ids, in the requested order; an id that is missing or not public is skipped. One
 * `in(...)` read through the public client in its own cache scope, tagged with `authorWorksTag` of each author in
 * the result only (the ids are the cache key), `hours` on success and `seconds` on failure (FR-2, FR-12).
 */
export async function listPoemsByIds(ids: readonly string[]): Promise<PoemSummariesResult> {
  void ids;
  throw new Error("not implemented");
}

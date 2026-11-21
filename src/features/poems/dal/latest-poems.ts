import "server-only";

import type { PoemSummariesResult } from "../model/poem-summary.types";

/**
 * The newest public poems, `created_at` then `id` descending, at most `limit`, through the public client in its own
 * cache scope: `minutes` on success (a new poem must show within the minute, a deliberate departure from ADR 0005 §3),
 * `seconds` on failure, tagged with `authorWorksTag` of the listed authors (FR-5, FR-12).
 */
export async function listLatestPoems(limit: number): Promise<PoemSummariesResult> {
  void limit;
  throw new Error("not implemented");
}

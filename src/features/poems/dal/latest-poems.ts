import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { POEM_SUMMARY_COLUMNS } from "../model/poem.constants";
import type { PoemSummariesResult } from "../model/poem-summary.types";

import { authorWorksTags, readPoemSummaries } from "./poem-summaries";

const READ_OPERATION = "read latest poems";

/** The newest poems: tagged after the read with the listed authors, `minutes` on success, seconds on failure. */
async function cachedLatestPoems(limit: number): Promise<PoemSummariesResult> {
  "use cache";

  const result = await readPoemSummaries(READ_OPERATION, (supabase) =>
    supabase
      .from("poems")
      .select(POEM_SUMMARY_COLUMNS)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit),
  );
  // Separate calls: cacheLife's typed overloads take each profile name as a literal.
  if (result.ok) cacheLife("minutes");
  else cacheLife("seconds");

  if (result.ok && result.poems.length > 0) cacheTag(...authorWorksTags(result.poems));
  return result;
}

/**
 * The newest public poems, `created_at` then `id` descending, at most `limit`, through the public client in its own
 * cache scope: `minutes` on success (a new poem must show within the minute, a deliberate departure from ADR 0005 §3),
 * `seconds` on failure, tagged with `authorWorksTag` of the listed authors (FR-5, FR-12).
 */
export function listLatestPoems(limit: number): Promise<PoemSummariesResult> {
  return cachedLatestPoems(limit);
}

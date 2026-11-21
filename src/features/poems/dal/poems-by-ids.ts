import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { lowercaseUuidSchema } from "../model/poem-row.schema";
import { POEM_SUMMARY_COLUMNS } from "../model/poem.constants";
import type { PoemSummariesResult } from "../model/poem-summary.types";

import { authorWorksTags, readPoemSummaries } from "./poem-summaries";

const READ_OPERATION = "read poems by ids";

const NO_POEMS: PoemSummariesResult = { ok: true, poems: [] };

/** Reads the poems the public client can see among `ids`, then puts them in the requested order. */
async function readPoemsByIds(ids: readonly string[]): Promise<PoemSummariesResult> {
  const result = await readPoemSummaries(READ_OPERATION, (supabase) =>
    supabase.from("poems").select(POEM_SUMMARY_COLUMNS).in("id", [...ids]),
  );
  if (!result.ok) return result;

  const byId = new Map(result.poems.map((poem) => [poem.id, poem]));
  const ordered = ids.flatMap((id) => byId.get(id) ?? []);
  return { ok: true, poems: ordered };
}

/** The entry of these ids: tagged after the read with the author of each poem in it, hours on success, seconds on failure. */
async function cachedPoemsByIds(ids: readonly string[]): Promise<PoemSummariesResult> {
  "use cache";

  const result = await readPoemsByIds(ids);
  // Separate calls: cacheLife's typed overloads take each profile name as a literal.
  if (result.ok) cacheLife("hours");
  else cacheLife("seconds");

  if (result.ok && result.poems.length > 0) cacheTag(...authorWorksTags(result.poems));
  return result;
}

/**
 * The public poems with these ids, in the requested order; an id that is missing or not public is skipped. One
 * `in(...)` read through the public client in its own cache scope, tagged with `authorWorksTag` of each author in
 * the result only (the ids are the cache key), `hours` on success and `seconds` on failure (FR-2, FR-12).
 * Nothing is asked and no cache scope opens for an empty list or when any id is not a UUID, so junk never becomes
 * a cache key.
 */
export async function listPoemsByIds(ids: readonly string[]): Promise<PoemSummariesResult> {
  if (ids.length === 0) return NO_POEMS;

  const allUuids = ids.every((id) => lowercaseUuidSchema.safeParse(id).success);
  if (!allUuids) return NO_POEMS;

  return cachedPoemsByIds(ids);
}

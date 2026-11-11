import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";
import { z } from "zod";

import { listAuthorPoems, lowercaseUuidSchema } from "@/features/poems";
import { authorWorksTag } from "@/shared/config/cache-tags";
import { SupabaseConfigError } from "@/shared/lib/supabase";
import { classifySupabaseError } from "@/shared/lib/supabase/classify-error";
import { createSupabasePublicClient } from "@/shared/lib/supabase/public";

import { hasCollectedPoems, nestPublicCollections } from "../model/nest-public-collections";
import { publicCollectionRowSchema, type PublicCollectionRow } from "../model/public-collection-row.schema";
import type {
  AuthorCollectionsResult,
  PublicCollectionEntry,
  PublicCollectionResult,
  PublicCollectionsResult,
} from "../model/public-collections.types";

// Runs as anon through the cookie-less client, so RLS returns only the non-empty collections of public authors
// (ADR 0013). Every caller shares one cache entry per author under the same tag as `poems`' entry, so one write
// expires both (public-collections D4). Failures are returned as values and cached for seconds, like `poems`.

const READ_OPERATION = "read public collections";

const collectionRowsSchema = z.array(publicCollectionRowSchema);

const UNAVAILABLE = { ok: false, reason: "unavailable" } as const;
const NOT_FOUND = { ok: false, reason: "not-found" } as const;
const POEMS_UNAVAILABLE = { ok: false, reason: "poems-unavailable" } as const;
const NO_COLLECTIONS: PublicCollectionsResult = { ok: true, collections: [] };

/** A loggable failure kind: a validation failure or the Supabase class. Never a message or an id (NFR-9). */
function failureKind(error: unknown): string {
  return error instanceof z.ZodError ? "invalid row" : classifySupabaseError(error);
}

/** Logs `[collections] <operation> failed: <kind>` and returns `unavailable`. */
function fail(error: unknown): PublicCollectionsResult {
  // The proxy already logs a missing config on every request.
  if (!(error instanceof SupabaseConfigError)) {
    console.error(`[collections] ${READ_OPERATION} failed: ${failureKind(error)}`);
  }
  return UNAVAILABLE;
}

function toEntry(row: PublicCollectionRow): PublicCollectionEntry {
  return { id: row.id, title: row.title, description: row.description };
}

/** Reads and parses the author's visible collections, newest created first. */
async function readPublicCollections(authorId: string): Promise<PublicCollectionsResult> {
  try {
    const supabase = createSupabasePublicClient();
    const { data, error, status } = await supabase
      .from("collections")
      .select("id, title, description, created_at")
      .eq("author_id", authorId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true });
    // postgrest-js keeps the status on the response; only the code and status are passed on.
    if (error) return fail({ code: error.code, status });

    const rows = collectionRowsSchema.safeParse(data);
    if (!rows.success) return fail(rows.error);

    return { ok: true, collections: rows.data.map(toEntry) };
  } catch (error) {
    return fail(error);
  }
}

/** The one cache entry of an author's collections: tagged `author-works:<authorId>`, hours on success, seconds on failure. */
async function cachedPublicCollections(authorId: string): Promise<PublicCollectionsResult> {
  "use cache";
  cacheTag(authorWorksTag(authorId));

  const result = await readPublicCollections(authorId);
  // Separate calls: cacheLife's typed overloads take each profile name as a literal.
  if (result.ok) cacheLife("hours");
  else cacheLife("seconds");
  return result;
}

/**
 * The author's visible collections, newest first. An id that isn't a UUID has none and opens no cache scope. The id
 * is lowercased, because the author page also opens for an uppercase spelling and writes expire the lowercase tag.
 * Memoized per request (public-collections D5).
 */
export const listPublicCollections = cache(async (authorId: string): Promise<PublicCollectionsResult> => {
  if (!z.uuid().safeParse(authorId).success) return NO_COLLECTIONS;
  return cachedPublicCollections(authorId.toLowerCase());
});

/**
 * The visible collections and `poems`' list read in parallel and nested; the poems are checked first, since without
 * them nothing can be shown (D5). Memoized per request.
 */
export const listAuthorCollections = cache(async (authorId: string): Promise<AuthorCollectionsResult> => {
  const [poems, collections] = await Promise.all([listAuthorPoems(authorId), listPublicCollections(authorId)]);
  if (!poems.ok) return POEMS_UNAVAILABLE;
  if (!collections.ok) {
    return { ok: false, reason: "collections-unavailable", hasCollectedPoems: hasCollectedPoems(poems.poems) };
  }
  return { ok: true, collections: nestPublicCollections(collections.collections, poems.poems) };
});

/**
 * One visible collection of the author, by exact lowercase id, found in `listAuthorCollections` so page and trail
 * share one result (ADR 0008). A malformed id is `not-found` with no read (public-collections D5).
 */
export const getPublicCollection = cache(
  async (authorId: string, collectionId: string): Promise<PublicCollectionResult> => {
    if (!lowercaseUuidSchema.safeParse(collectionId).success) return NOT_FOUND;

    const list = await listAuthorCollections(authorId);
    if (!list.ok) return UNAVAILABLE;

    const collection = list.collections.find((candidate) => candidate.id === collectionId);
    return collection === undefined ? NOT_FOUND : { ok: true, collection };
  },
);

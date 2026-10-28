import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { cache } from "react";
import { z } from "zod";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { classifySupabaseError } from "@/shared/lib/supabase/classify-error";
import { createSupabasePublicClient } from "@/shared/lib/supabase/public";

import { poemsTag } from "../model/poem-cache-tags";
import { lowercaseUuidSchema, poemRowSchema } from "../model/poem-row.schema";
import { POEM_COLUMNS } from "../model/poem.constants";
import type { AuthorPoemResult, AuthorPoemsResult } from "../model/poem.types";

import { toPoem } from "./poem-row";

// The only reader of `public.poems` (NFR-3). It runs as anon through the cookie-less client, so RLS
// returns only poems of public authors, and every caller (the public author and poem pages, the
// owner's pages) shares one cache entry per author (design D3, NFR-4). Failures are returned as
// values and cached for seconds, like the authors reads (author-profiles NFR-7).

const READ_OPERATION = "read author poems";

const poemRowsSchema = z.array(poemRowSchema);

const UNAVAILABLE = { ok: false, reason: "unavailable" } as const;
const NOT_FOUND = { ok: false, reason: "not-found" } as const;
const NO_POEMS: AuthorPoemsResult = { ok: true, poems: [] };

/** A loggable failure kind: a validation failure or the Supabase class. Never a message or an id (NFR-10). */
function failureKind(error: unknown): string {
  return error instanceof z.ZodError ? "invalid row" : classifySupabaseError(error);
}

/** Logs `[poems] <operation> failed: <kind>` and returns `unavailable`. */
function fail(error: unknown): AuthorPoemsResult {
  // The proxy already logs a missing config on every request.
  if (!(error instanceof SupabaseConfigError)) console.error(`[poems] ${READ_OPERATION} failed: ${failureKind(error)}`);
  return UNAVAILABLE;
}

/** Reads, parses, and maps the author's rows, newest created first. */
async function readAuthorPoems(authorId: string): Promise<AuthorPoemsResult> {
  try {
    const supabase = createSupabasePublicClient();
    const { data, error, status } = await supabase
      .from("poems")
      .select(POEM_COLUMNS)
      .eq("author_id", authorId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true });
    // postgrest-js keeps the status on the response; only the code and status are passed on.
    if (error) return fail({ code: error.code, status });

    const rows = poemRowsSchema.safeParse(data);
    if (!rows.success) return fail(rows.error);

    return { ok: true, poems: rows.data.map((row) => toPoem(supabase, row)) };
  } catch (error) {
    return fail(error);
  }
}

/** The one cache entry of an author's poems: tagged `poems:<authorId>`, hours on success, seconds on failure. */
async function cachedAuthorPoems(authorId: string): Promise<AuthorPoemsResult> {
  "use cache";
  cacheTag(poemsTag(authorId));

  const result = await readAuthorPoems(authorId);
  // Separate calls: cacheLife's typed overloads take each profile name as a literal.
  if (result.ok) cacheLife("hours");
  else cacheLife("seconds");
  return result;
}

/**
 * The author's poems, newest first. An id that isn't a UUID has no poems and opens no cache scope.
 * The id is lowercased, because the author page also opens for an uppercase spelling and a create
 * expires the lowercase tag. Memoized per request. Callers check the author first (design D3).
 */
export const listAuthorPoems = cache(async (authorId: string): Promise<AuthorPoemsResult> => {
  if (!z.uuid().safeParse(authorId).success) return NO_POEMS;
  return cachedAuthorPoems(authorId.toLowerCase());
});

/**
 * One poem of the author, by exact, case-sensitive id, found in the author's list so the two can't
 * disagree. A malformed id is `not-found` with no read. Memoized per request, so a page and its
 * breadcrumb trail share one result (ADR 0008).
 */
export const getAuthorPoem = cache(async (authorId: string, poemId: string): Promise<AuthorPoemResult> => {
  if (!lowercaseUuidSchema.safeParse(poemId).success) return NOT_FOUND;

  const list = await listAuthorPoems(authorId);
  if (!list.ok) return list;

  const poem = list.poems.find((candidate) => candidate.id === poemId);
  return poem === undefined ? NOT_FOUND : { ok: true, poem };
});

import "server-only";

import { cacheLife } from "next/cache";
import { z } from "zod";

import { SupabaseConfigError } from "@/shared/lib/supabase";
import { classifySupabaseError } from "@/shared/lib/supabase/classify-error";
import { createSupabasePublicClient } from "@/shared/lib/supabase/public";

import { poemRefRowSchema, type PoemRefRow } from "../model/poem-row.schema";
import type { PublicPoemRef, PublicPoemRefsResult } from "../model/public-poem-refs.types";

// The sitemap's reader of `public.poems` (seo-metadata design D5): ids only, every author's poems at
// once, so the entry has no single author to tag and carries no tag; it expires by lifetime (NFR-5).
// It runs as anon through the cookie-less client, so RLS returns only poems of public authors.

const READ_OPERATION = "read public poem refs";

const REF_COLUMNS = "id, author_id, collection_id";

/** The rows asked for per request: Supabase's `max_rows` default, so a hosted cap at or above it needs no more requests than it must. */
const PAGE_SIZE = 1000;

const refRowsSchema = z.array(poemRefRowSchema);

const UNAVAILABLE = { ok: false, reason: "unavailable" } as const;

type PageResult = { readonly ok: true; readonly rows: readonly PoemRefRow[] } | { readonly ok: false };

/** A loggable failure kind: a validation failure or the Supabase class. Never a message or an id (NFR-10). */
function failureKind(error: unknown): string {
  return error instanceof z.ZodError ? "invalid row" : classifySupabaseError(error);
}

/** Logs `[poems] <operation> failed: <kind>` and returns the failed page. */
function failPage(error: unknown): PageResult {
  // The proxy already logs a missing config on every request.
  if (!(error instanceof SupabaseConfigError)) console.error(`[poems] ${READ_OPERATION} failed: ${failureKind(error)}`);
  return { ok: false };
}

function toRef(row: PoemRefRow): PublicPoemRef {
  return { id: row.id, authorId: row.author_id, collectionId: row.collection_id };
}

/** One page of rows from `offset`, ordered by id so the pages never overlap or skip. */
async function readPage(offset: number): Promise<PageResult> {
  try {
    const supabase = createSupabasePublicClient();
    const { data, error, status } = await supabase
      .from("poems")
      .select(REF_COLUMNS)
      .order("id", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    // postgrest-js keeps the status on the response; only the code and status are passed on.
    if (error) return failPage({ code: error.code, status });

    const rows = refRowsSchema.safeParse(data);
    if (!rows.success) return failPage(rows.error);

    return { ok: true, rows: rows.data };
  } catch (error) {
    return failPage(error);
  }
}

/**
 * Reads page after page until one is empty, not until a short one: a hosted cap below `PAGE_SIZE` returns
 * short pages, and the next page starts after the rows actually received. Any page error fails the whole
 * read, so no partial list is returned as complete.
 */
async function readPublicPoemRefs(): Promise<PublicPoemRefsResult> {
  const refs: PublicPoemRef[] = [];

  let page = await readPage(0);
  while (page.ok && page.rows.length > 0) {
    refs.push(...page.rows.map(toRef));
    page = await readPage(refs.length);
  }

  if (!page.ok) return UNAVAILABLE;
  return { ok: true, refs };
}

/**
 * Every public poem's id, author id and collection id for the sitemap, in one `"use cache"` scope: `hours`
 * on success, `seconds` on failure so an outage or an env-less build heals itself, and no tag (design D5).
 */
export async function listPublicPoemRefs(): Promise<PublicPoemRefsResult> {
  "use cache";

  const result = await readPublicPoemRefs();
  // Separate calls: cacheLife's typed overloads take each profile name as a literal.
  if (result.ok) cacheLife("hours");
  else cacheLife("seconds");
  return result;
}

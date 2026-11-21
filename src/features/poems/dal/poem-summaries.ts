import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { authorWorksTag } from "@/shared/config/cache-tags";
import { SupabaseConfigError } from "@/shared/lib/supabase";
import { classifySupabaseError } from "@/shared/lib/supabase/classify-error";
import { createSupabasePublicClient } from "@/shared/lib/supabase/public";

import { poemSummaryRowSchema } from "../model/poem-row.schema";
import type { PoemSummariesResult, PoemSummary } from "../model/poem-summary.types";

import { toPoemSummary } from "./poem-row";

// What the home page's two poem reads share: the query's response checked and mapped to summaries, the
// failure logged by kind only, and the cache tags of the authors in a result (home-page-sections design D3, D5).

const summaryRowsSchema = z.array(poemSummaryRowSchema);

const UNAVAILABLE_SUMMARIES = { ok: false, reason: "unavailable" } as const;

/** What a postgrest-js query resolves with, as far as the reads look at it. */
interface QueryResponse {
  readonly data: unknown;
  readonly error: { readonly code: string } | null;
  readonly status: number;
}

/** A loggable failure kind: a validation failure or the Supabase class. Never a message or an id (NFR-10). */
function failureKind(error: unknown): string {
  return error instanceof z.ZodError ? "invalid row" : classifySupabaseError(error);
}

/** Logs `[poems] <operation> failed: <kind>` and returns `unavailable`. */
function fail(operation: string, error: unknown): PoemSummariesResult {
  // The proxy already logs a missing config on every request.
  if (!(error instanceof SupabaseConfigError)) console.error(`[poems] ${operation} failed: ${failureKind(error)}`);
  return UNAVAILABLE_SUMMARIES;
}

/** Runs the caller's query through the public client, checks every row, and maps the rows in the order received. */
export async function readPoemSummaries(
  operation: string,
  runQuery: (supabase: SupabaseClient) => PromiseLike<QueryResponse>,
): Promise<PoemSummariesResult> {
  try {
    const supabase = createSupabasePublicClient();
    const { data, error, status } = await runQuery(supabase);
    // postgrest-js keeps the status on the response; only the code and status are passed on.
    if (error) return fail(operation, { code: error.code, status });

    const rows = summaryRowsSchema.safeParse(data);
    if (!rows.success) return fail(operation, rows.error);

    return { ok: true, poems: rows.data.map((row) => toPoemSummary(supabase, row)) };
  } catch (error) {
    return fail(operation, error);
  }
}

/** `author-works:<authorId>` once for every author in the poems, so a deletion by any of them expires the entry. */
export function authorWorksTags(poems: readonly PoemSummary[]): string[] {
  const authorIds = new Set(poems.map((poem) => poem.authorId));
  return [...authorIds].map(authorWorksTag);
}

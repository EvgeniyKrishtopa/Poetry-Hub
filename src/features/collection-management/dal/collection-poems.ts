import "server-only";

import { cache } from "react";
import { z } from "zod";

import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import type { CollectedPoemsResult, CollectionPoemChoicesResult } from "../model/collection-management.types";

import { logFailure, withStatus } from "./write-log";

// Uncached, like the feature's other reads (ADR 0011), but through definer functions instead of RLS: the poems
// table is public and `collection_id` has no grant, so the functions' own caller filter keeps each author to
// their own poems (add-poems-to-collections D3, ADR 0012). Log lines carry the failure kind only (NFR-5).

const CHOICES_OPERATION = "read collection poem choices";
const COLLECTED_OPERATION = "list collected poems";

const READ_FAILED = { ok: false } as const;

/** `my_collection_poem_choices()`'s rows; any other shape fails the parse and is a failed read, never a guessed list. */
const choiceRowsSchema = z.array(z.object({ id: z.uuid(), title: z.string().min(1), selected: z.boolean() }));

/** `my_collected_poems()`'s rows, renamed to the app's spelling. */
const collectedRowsSchema = z.array(
  z
    .object({ collection_id: z.uuid(), id: z.uuid(), title: z.string().min(1) })
    .transform((row) => ({ collectionId: row.collection_id, id: row.id, title: row.title })),
);

type RowsResult<Rows> = { readonly ok: true; readonly rows: Rows } | typeof READ_FAILED;

/** Calls a read function as the signed-in author and parses its rows; a failure is logged and is a value. */
async function readRows<Rows>(
  operation: string,
  fn: string,
  args: Readonly<Record<string, unknown>>,
  schema: z.ZodType<Rows>,
): Promise<RowsResult<Rows>> {
  try {
    const supabase = await createSupabaseServerClient();
    const response = await supabase.rpc(fn, args);
    if (response.error) {
      logFailure(operation, withStatus(response.error, response.status));
      return READ_FAILED;
    }

    const rows = schema.safeParse(response.data);
    if (!rows.success) {
      logFailure(operation, rows.error);
      return READ_FAILED;
    }
    return { ok: true, rows: rows.data };
  } catch (error) {
    // A config error, or an unexpected throw (a network failure): still a value.
    logFailure(operation, error);
    return READ_FAILED;
  }
}

/**
 * The collection's own poems and the author's free ones, newest first, through the definer function
 * `my_collection_poem_choices` (add-poems-to-collections D3, ADR 0012). Callers have passed `getOwnCollection`,
 * so an empty list means nothing to manage, never "not yours".
 */
export async function getCollectionPoemChoices(collectionId: string): Promise<CollectionPoemChoicesResult> {
  const result = await readRows(CHOICES_OPERATION, "my_collection_poem_choices", { collection_id: collectionId }, choiceRowsSchema);
  return result.ok ? { ok: true, choices: result.rows } : READ_FAILED;
}

/**
 * The author's poems that are in a collection, newest first, through `my_collected_poems` (add-poems-to-collections D3).
 * Memoized per request, so the `/account/poems` section and its poem list share one result and always agree
 * (show-only-free-poems D2); still read afresh on every request (ADR 0011).
 */
export const listCollectedPoems = cache(async (): Promise<CollectedPoemsResult> => {
  const result = await readRows(COLLECTED_OPERATION, "my_collected_poems", {}, collectedRowsSchema);
  return result.ok ? { ok: true, poems: result.rows } : READ_FAILED;
});

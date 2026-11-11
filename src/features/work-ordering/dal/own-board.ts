import "server-only";

import { z } from "zod";

import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { nestBoard, type BoardCollectionRow, type BoardPoemRow } from "../model/board-nesting";
import type { OwnBoardResult } from "../model/work-ordering.types";

import { logFailure, withStatus } from "./write-log";

// Uncached on purpose: the cookie client runs as the signed-in reader and a cache scope can't read the session
// (ADR 0011). RLS also lets this client read other public authors' rows (ADR 0013), so both reads filter by the own
// author id themselves (ADR 0013 §5). A failed read is a value, and its log line names the operation and the failure
// kind only (NFR-7).

const COLLECTIONS_TABLE = "collections";
const POEMS_TABLE = "poems";
const COLLECTIONS_OPERATION = "list board collections";
const POEMS_OPERATION = "list board poems";

type CollectionsRead = { readonly ok: true; readonly rows: BoardCollectionRow[] } | { readonly ok: false };
type PoemsRead = { readonly ok: true; readonly rows: BoardPoemRow[] } | { readonly ok: false };

const READ_FAILED = { ok: false } as const;

const collectionRowsSchema = z.array(z.object({ id: z.uuid(), title: z.string().min(1) }));
const poemRowsSchema = z.array(
  z.object({ id: z.uuid(), title: z.string().min(1), collection_id: z.uuid().nullable() }),
);

async function readCollections(authorId: string): Promise<CollectionsRead> {
  try {
    const supabase = await createSupabaseServerClient();
    const response = await supabase
      .from(COLLECTIONS_TABLE)
      .select("id, title")
      .eq("author_id", authorId)
      .order("position", { ascending: true })
      .order("id", { ascending: true });
    if (response.error) {
      logFailure(COLLECTIONS_OPERATION, withStatus(response.error, response.status));
      return READ_FAILED;
    }

    const rows = collectionRowsSchema.safeParse(response.data);
    if (!rows.success) {
      logFailure(COLLECTIONS_OPERATION, rows.error);
      return READ_FAILED;
    }
    return { ok: true, rows: rows.data };
  } catch (error) {
    logFailure(COLLECTIONS_OPERATION, error);
    return READ_FAILED;
  }
}

async function readPoems(authorId: string): Promise<PoemsRead> {
  try {
    const supabase = await createSupabaseServerClient();
    // `position` orders both the free poems and each collection's poems: it is per container (design D1).
    const response = await supabase
      .from(POEMS_TABLE)
      .select("id, title, collection_id")
      .eq("author_id", authorId)
      .order("position", { ascending: true })
      .order("id", { ascending: true });
    if (response.error) {
      logFailure(POEMS_OPERATION, withStatus(response.error, response.status));
      return READ_FAILED;
    }

    const rows = poemRowsSchema.safeParse(response.data);
    if (!rows.success) {
      logFailure(POEMS_OPERATION, rows.error);
      return READ_FAILED;
    }
    return {
      ok: true,
      rows: rows.data.map(({ id, title, collection_id }) => ({ id, title, collectionId: collection_id })),
    };
  } catch (error) {
    logFailure(POEMS_OPERATION, error);
    return READ_FAILED;
  }
}

/**
 * The author's collections and poems in parallel, each filtered by the author's own id and ordered by
 * `position, id`, then nested; either read failing says which (design D4). Each read logs its own failure.
 */
export async function listOwnBoard(authorId: string): Promise<OwnBoardResult> {
  const [collections, poems] = await Promise.all([readCollections(authorId), readPoems(authorId)]);
  // The poems' text wins when both fail: either way no board is shown (design D4's failure matrix).
  if (!poems.ok) return { ok: false, reason: "poems-unavailable" };
  if (!collections.ok) return { ok: false, reason: "collections-unavailable" };
  return { ok: true, arrangement: nestBoard(collections.rows, poems.rows) };
}

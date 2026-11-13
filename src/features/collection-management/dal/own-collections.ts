import "server-only";

import { cache } from "react";
import { z } from "zod";

import { getOwnPublicAuthor } from "@/features/authors";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { isCollectionId } from "../model/collection-form.schema";
import type { OwnCollectionResult, OwnCollectionTitleResult } from "../model/collection-management.types";

import { logFailure, withStatus } from "./write-log";

// Uncached on purpose: the cookie client runs as the signed-in reader, and a cache scope can't read the session
// (design D4, ADR 0011). RLS also lets this client read other public authors' non-empty collections (ADR 0013),
// so every read here filters by the own author id itself. Log lines carry the failure kind only (NFR-5).

const COLLECTIONS_TABLE = "collections";
const READ_OPERATION = "read collection";

const NOT_FOUND = { ok: false, reason: "not-found" } as const;
const UNAVAILABLE = { ok: false, reason: "unavailable" } as const;

/** One row as the collection page and the edit page show it; `description` is never `''` (design D2). */
const collectionRowSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1),
  description: z.string().min(1).nullable(),
});

/** The row by id and owner; another author's row doesn't match the owner filter, so it reads as none (design D4). */
async function readOwnCollection(authorId: string, collectionId: string): Promise<OwnCollectionResult> {
  try {
    const supabase = await createSupabaseServerClient();
    const response = await supabase
      .from(COLLECTIONS_TABLE)
      .select("id, title, description")
      .eq("id", collectionId)
      .eq("author_id", authorId)
      .maybeSingle();
    if (response.error) {
      logFailure(READ_OPERATION, withStatus(response.error, response.status));
      return UNAVAILABLE;
    }
    if (response.data === null) return NOT_FOUND;

    const row = collectionRowSchema.safeParse(response.data);
    if (!row.success) {
      logFailure(READ_OPERATION, row.error);
      return UNAVAILABLE;
    }
    return { ok: true, collection: row.data };
  } catch (error) {
    logFailure(READ_OPERATION, error);
    return UNAVAILABLE;
  }
}

/**
 * One own collection, memoized per request so the page and its trail share one read (design D4, ADR 0008):
 * malformed id, another author's, or a non-public own profile → `not-found`; a failed read → `unavailable`.
 */
export const getOwnCollection = cache(async (collectionId: string): Promise<OwnCollectionResult> => {
  if (!isCollectionId(collectionId)) return NOT_FOUND;

  const own = await getOwnPublicAuthor();
  if (!own.ok) return UNAVAILABLE;
  if (own.status === "not-public") return NOT_FOUND;

  return readOwnCollection(own.authorId, collectionId);
});

/** The trail's title item, derived from `getOwnCollection` (design D11). */
export async function getOwnCollectionTitle(collectionId: string): Promise<OwnCollectionTitleResult> {
  const result = await getOwnCollection(collectionId);
  return result.ok ? { ok: true, title: result.collection.title } : result;
}

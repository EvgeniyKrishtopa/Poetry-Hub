import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";

import { createSupabasePublicClient } from "@/shared/lib/supabase/public";

import { AUTHORS_TAG, authorTag } from "../model/author-cache-tags";
import { authorIdSchema, profileRowSchema } from "../model/author-profile.schema";
import { PUBLIC_AUTHOR_COLUMNS } from "../model/author.constants";
import type { PublicAuthor, PublicAuthorResult, PublicAuthorsResult } from "../model/author.types";
import { compareAuthors } from "../model/compare-authors";

import { toProfileFailure, withStatus } from "./profile-failure";
import { toPublicAuthor } from "./profile-queries";

// Both reads run as anon through the cookie-less client, so RLS returns only public rows, and each
// opens its own cache scope: the lifetime depends on the result, set after the read (design D5, NFR-7).
// Failures are returned as values, so they are cached too, briefly.

const LIST_OPERATION = "list public authors";
const READ_OPERATION = "read public author";

const publicRowsSchema = z.array(profileRowSchema);

const UNAVAILABLE = { ok: false, reason: "unavailable" } as const;

/** Sets the enclosing cache scope's lifetime from the result it is about to return (NFR-7). */
function cacheForResult(result: PublicAuthorResult | PublicAuthorsResult): void {
  if (result.ok) cacheLife("hours");
  // Random valid UUIDs must not pin entries for hours.
  else if (result.reason === "not-found") cacheLife("minutes");
  // A Supabase blip or an env-less build heals itself instead of freezing into the shell.
  else cacheLife("seconds");
}

/** Reads, parses, maps, and sorts every public row. */
async function readPublicAuthors(): Promise<PublicAuthorsResult> {
  try {
    const supabase = createSupabasePublicClient();
    // No `order`: PostgREST can't sort on lower(...), so the list is sorted here (design D5).
    const { data, error, status } = await supabase.from("author_profiles").select(PUBLIC_AUTHOR_COLUMNS);
    if (error) {
      toProfileFailure(LIST_OPERATION, withStatus(error, status));
      return UNAVAILABLE;
    }

    const rows = publicRowsSchema.safeParse(data);
    if (!rows.success) {
      toProfileFailure(LIST_OPERATION, rows.error);
      return UNAVAILABLE;
    }

    const authors = rows.data
      .map((row) => toPublicAuthor(supabase, row))
      .filter((author): author is PublicAuthor => author !== null)
      .sort(compareAuthors);
    return { ok: true, authors };
  } catch (error) {
    toProfileFailure(LIST_OPERATION, error);
    return UNAVAILABLE;
  }
}

/** Every public profile, sorted; cached under the directory tag with a result-dependent lifetime (design D5). */
export async function listPublicAuthors(): Promise<PublicAuthorsResult> {
  "use cache";
  cacheTag(AUTHORS_TAG);

  const result = await readPublicAuthors();
  cacheForResult(result);
  return result;
}

/** Reads and maps one public row; a missing or non-public row is `not-found`. */
async function readPublicAuthor(id: string): Promise<PublicAuthorResult> {
  try {
    const supabase = createSupabasePublicClient();
    const { data, error, status } = await supabase
      .from("author_profiles")
      .select(PUBLIC_AUTHOR_COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) {
      toProfileFailure(READ_OPERATION, withStatus(error, status));
      return UNAVAILABLE;
    }
    if (data === null) return { ok: false, reason: "not-found" };

    const row = profileRowSchema.safeParse(data);
    if (!row.success) {
      toProfileFailure(READ_OPERATION, row.error);
      return UNAVAILABLE;
    }

    const author = toPublicAuthor(supabase, row.data);
    return author === null ? { ok: false, reason: "not-found" } : { ok: true, author };
  } catch (error) {
    toProfileFailure(READ_OPERATION, error);
    return UNAVAILABLE;
  }
}

async function cachedPublicAuthor(id: string): Promise<PublicAuthorResult> {
  "use cache";
  cacheTag(authorTag(id));

  const result = await readPublicAuthor(id);
  cacheForResult(result);
  return result;
}

/** One public profile; a non-UUID id is `not-found` before any cache scope opens (design D5). */
export async function getPublicAuthor(id: string): Promise<PublicAuthorResult> {
  if (!authorIdSchema.safeParse(id).success) return { ok: false, reason: "not-found" };
  return cachedPublicAuthor(id);
}

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { PoemRow } from "../model/poem-row.schema";
import { POEM_ILLUSTRATIONS_BUCKET } from "../model/poem.constants";
import type { Poem } from "../model/poem.types";

/** `YYYY-MM-DD` is the first ten characters of an ISO timestamp. */
const ISO_DATE_LENGTH = 10;

/** The UTC date of a timestamp, so the server's time zone never shifts the day (FR-9). */
function utcDate(timestamp: string): string {
  return new Date(timestamp).toISOString().slice(0, ISO_DATE_LENGTH);
}

/** The public URL of a stored illustration: a string build, no request (design D3). */
function illustrationPublicUrl(supabase: SupabaseClient, path: string | null): string | null {
  return path === null ? null : supabase.storage.from(POEM_ILLUSTRATIONS_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** A checked row → `Poem`: the illustration's public-bucket URL and `created_at`'s UTC date (design D3). */
export function toPoem(supabase: SupabaseClient, row: PoemRow): Poem {
  return {
    id: row.id,
    title: row.title,
    text: row.text,
    illustrationUrl: illustrationPublicUrl(supabase, row.illustration_path),
    publishedAt: utcDate(row.created_at),
    genreId: row.genre_id,
  };
}

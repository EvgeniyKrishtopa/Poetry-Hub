import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { z } from "zod";

import { authorIdSchema, profileRowSchema, type ProfileRow } from "../model/author-profile.schema";
import { AUTHOR_PHOTOS_BUCKET } from "../model/author.constants";
import type { AuthorProfile, MyProfileResult, ProfileFailure, PublicAuthor } from "../model/author.types";
import { hasProfileContent } from "../model/has-profile-content";

import { toProfileFailure, withStatus } from "./profile-failure";

// The query plumbing every authors DAL module shares: the own-profile id functions, row parsing,
// and row → domain mapping. Rows never carry user_id: no client role can select it (design D2).

/** The postgrest-js response fields the DAL reads. */
interface QueryResponse {
  readonly data: unknown;
  readonly error: { readonly code?: string } | null;
  readonly status: number;
}

type OwnProfileIdResult<Id> =
  | { readonly ok: true; readonly id: Id }
  | { readonly ok: false; readonly failure: ProfileFailure };

/** Calls a database function that resolves the caller from `auth.uid()`, so no user id is sent (CR-01). */
async function callOwnProfileIdFunction<Id>(
  supabase: SupabaseClient,
  fn: "ensure_my_author_profile" | "my_author_profile_id",
  idSchema: z.ZodType<Id>,
  operation: string,
): Promise<OwnProfileIdResult<Id>> {
  const response: QueryResponse = await supabase.rpc(fn);
  if (response.error) return { ok: false, failure: toProfileFailure(operation, withStatus(response.error, response.status)) };

  const id = idSchema.safeParse(response.data);
  if (!id.success) return { ok: false, failure: toProfileFailure(operation, id.error) };
  return { ok: true, id: id.data };
}

/** The caller's profile id, or `null` when they have no row yet. */
export function findOwnProfileId(supabase: SupabaseClient, operation: string): Promise<OwnProfileIdResult<string | null>> {
  return callOwnProfileIdFunction(supabase, "my_author_profile_id", authorIdSchema.nullable(), operation);
}

/** The caller's profile id, creating an empty row first if there is none (design D3). */
export function ensureOwnProfileId(supabase: SupabaseClient, operation: string): Promise<OwnProfileIdResult<string>> {
  return callOwnProfileIdFunction(supabase, "ensure_my_author_profile", authorIdSchema, operation);
}

/** The public URL of a stored photo: a string build, no request (design D5). */
function photoPublicUrl(supabase: SupabaseClient, path: string | null): string | null {
  return path === null ? null : supabase.storage.from(AUTHOR_PHOTOS_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** The owner's view of a row; a row with no content reads as no profile (design D3). */
function toAuthorProfile(supabase: SupabaseClient, row: ProfileRow): AuthorProfile | null {
  if (!hasProfileContent(row)) return null;
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    about: row.about,
    photoUrl: photoPublicUrl(supabase, row.photo_path),
  };
}

/** A public row as a `PublicAuthor`; `null` if a name is missing, which anon RLS never returns. */
export function toPublicAuthor(supabase: SupabaseClient, row: ProfileRow): PublicAuthor | null {
  if (row.first_name === null || row.last_name === null) return null;
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    about: row.about,
    photoUrl: photoPublicUrl(supabase, row.photo_path),
  };
}

/**
 * An owner-row response (`OWNER_PROFILE_COLUMNS`) → the result the actions and pages read: the
 * error classified, the row Zod-parsed, and `null` data (no row) read as no profile.
 */
export function toMyProfileResult(supabase: SupabaseClient, operation: string, response: QueryResponse): MyProfileResult {
  if (response.error) return { ok: false, failure: toProfileFailure(operation, withStatus(response.error, response.status)) };
  if (response.data === null) return { ok: true, profile: null };

  const row = profileRowSchema.safeParse(response.data);
  if (!row.success) return { ok: false, failure: toProfileFailure(operation, row.error) };
  return { ok: true, profile: toAuthorProfile(supabase, row.data) };
}

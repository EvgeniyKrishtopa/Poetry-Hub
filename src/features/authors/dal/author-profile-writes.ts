import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { IMAGE_FORMATS } from "@/shared/lib/image-file/image-file.constants";
import type { ImageType } from "@/shared/lib/image-file/image-file.types";
import { createSupabaseServerClient } from "@/shared/lib/supabase/server";

import { AUTHOR_PHOTOS_BUCKET, OWNER_PROFILE_COLUMNS } from "../model/author.constants";
import type { NameField, ProfileFailure, ProfileRowPatch, ProfileWriteResult } from "../model/author.types";

import { toProfileFailure, withStatus } from "./profile-failure";
import { ensureOwnProfileId, findOwnProfileId, toMyProfileResult } from "./profile-queries";

// Every write runs with the cookie client as the signed-in owner; the database functions resolve the
// caller, so none of these takes a user id (design D3). Each returns a failure as a value, never throws.

const TABLE = "author_profiles";

const photoPathRowSchema = z.object({ photo_path: z.string().nullable() }).nullable();

/** `row: null`: the row went away after its id was read (a stale editor in a second tab). */
type PhotoPathResult =
  | { readonly ok: true; readonly row: { readonly photo_path: string | null } | null }
  | { readonly ok: false; readonly failure: ProfileFailure };

/** Runs a write with a fresh cookie client; a config error or an unexpected throw becomes a failure. */
async function withServerClient(
  operation: string,
  write: (supabase: SupabaseClient) => Promise<ProfileWriteResult>,
): Promise<ProfileWriteResult> {
  try {
    return await write(await createSupabaseServerClient());
  } catch (error) {
    return { ok: false, failure: toProfileFailure(operation, error) };
  }
}

/** The row's current photo path, read by id; `.maybeSingle()`, as the row may be gone (design D3 N5). */
async function readPhotoPath(supabase: SupabaseClient, id: string, operation: string): Promise<PhotoPathResult> {
  const { data, error, status } = await supabase.from(TABLE).select("photo_path").eq("id", id).maybeSingle();
  if (error) return { ok: false, failure: toProfileFailure(operation, withStatus(error, status)) };

  const row = photoPathRowSchema.safeParse(data);
  if (!row.success) return { ok: false, failure: toProfileFailure(operation, row.error) };
  return { ok: true, row: row.data };
}

/** Removes a stored photo without failing the caller: an orphaned file is a known risk (design Risks). */
async function removePhotoBestEffort(supabase: SupabaseClient, path: string, operation: string): Promise<void> {
  try {
    const { error } = await supabase.storage.from(AUTHOR_PHOTOS_BUCKET).remove([path]);
    if (error) toProfileFailure(operation, error);
  } catch (error) {
    toProfileFailure(operation, error);
  }
}

const WRITE_OPERATION = "write profile";

/** Ensures the owner's row exists (`ensure_my_author_profile()`), then updates it by id. */
export async function writeOwnProfile(patch: ProfileRowPatch): Promise<ProfileWriteResult> {
  return withServerClient(WRITE_OPERATION, async (supabase) => {
    const own = await ensureOwnProfileId(supabase, WRITE_OPERATION);
    if (!own.ok) return own;

    // `.single()`: the row exists, the function above just ensured it.
    const response = await supabase.from(TABLE).update(patch).eq("id", own.id).select(OWNER_PROFILE_COLUMNS).single();
    return toMyProfileResult(supabase, WRITE_OPERATION, response);
  });
}

const CLEAR_OPERATION = "clear profile field";

/** Clears one text field, and only that field (FR-10). */
export async function clearProfileField(field: NameField | "about"): Promise<ProfileWriteResult> {
  return withServerClient(CLEAR_OPERATION, async (supabase) => {
    const own = await findOwnProfileId(supabase, CLEAR_OPERATION);
    if (!own.ok) return own;
    // No row (a stale editor in a second tab): there is nothing to clear, so the field is already gone.
    if (own.id === null) return { ok: true, profile: null };

    const patch: ProfileRowPatch = { [field]: null };
    // `.maybeSingle()`: the row may have gone since the id was read (design D3 N5).
    const response = await supabase
      .from(TABLE)
      .update(patch)
      .eq("id", own.id)
      .select(OWNER_PROFILE_COLUMNS)
      .maybeSingle();
    return toMyProfileResult(supabase, CLEAR_OPERATION, response);
  });
}

const REPLACE_PHOTO_OPERATION = "replace photo";

/** Uploads the new photo, points the row at it, then removes the old file (design D4). */
export async function replacePhoto(file: File, type: ImageType): Promise<ProfileWriteResult> {
  return withServerClient(REPLACE_PHOTO_OPERATION, async (supabase) => {
    // 1. The folder is the profile id, so the row must exist first.
    const own = await ensureOwnProfileId(supabase, REPLACE_PHOTO_OPERATION);
    if (!own.ok) return own;
    const previous = await readPhotoPath(supabase, own.id, REPLACE_PHOTO_OPERATION);
    if (!previous.ok) return previous;
    // Gone right after it was ensured (the account was deleted meanwhile): nothing to upload into.
    if (previous.row === null) {
      return { ok: false, failure: toProfileFailure(REPLACE_PHOTO_OPERATION, new Error("profile row gone")) };
    }
    const previousPath = previous.row.photo_path;

    // 2. A fresh name per upload, so a cached public URL never shows a stale image. The extension and
    //    content type come from the sniffed type, never from the browser-supplied `file.type` (FR-8).
    const { extension, contentType } = IMAGE_FORMATS[type];
    const path = `${own.id}/${crypto.randomUUID()}.${extension}`;
    // Re-wrapped: for a File/Blob body Storage stores the body's own type and ignores `contentType`.
    const body = new Blob([file], { type: contentType });
    const upload = await supabase.storage.from(AUTHOR_PHOTOS_BUCKET).upload(path, body, { contentType, upsert: false });
    if (upload.error) return { ok: false, failure: toProfileFailure(REPLACE_PHOTO_OPERATION, upload.error) };

    // 3. Point the row at it; on failure, remove the upload so nothing references a lost file.
    const response = await supabase
      .from(TABLE)
      .update({ photo_path: path })
      .eq("id", own.id)
      .select(OWNER_PROFILE_COLUMNS)
      .single();
    const result = toMyProfileResult(supabase, REPLACE_PHOTO_OPERATION, response);
    if (!result.ok) {
      await removePhotoBestEffort(supabase, path, REPLACE_PHOTO_OPERATION);
      return result;
    }

    // 4. The reader's photo did change, so a failed cleanup is only logged.
    if (previousPath !== null) await removePhotoBestEffort(supabase, previousPath, REPLACE_PHOTO_OPERATION);
    return result;
  });
}

const REMOVE_PHOTO_OPERATION = "remove photo";

/** Clears the photo path, then removes the file best-effort (design D3). */
export async function removePhoto(): Promise<ProfileWriteResult> {
  return withServerClient(REMOVE_PHOTO_OPERATION, async (supabase) => {
    const own = await findOwnProfileId(supabase, REMOVE_PHOTO_OPERATION);
    if (!own.ok) return own;
    if (own.id === null) return { ok: true, profile: null };

    const previous = await readPhotoPath(supabase, own.id, REMOVE_PHOTO_OPERATION);
    if (!previous.ok) return previous;
    // The row went away since its id was read: there is no photo left to delete (design D3 N5).
    if (previous.row === null) return { ok: true, profile: null };
    const previousPath = previous.row.photo_path;

    // The row is cleared before the file goes, so a failure never leaves a profile pointing at a
    // missing file (Gate 1 C4).
    const response = await supabase
      .from(TABLE)
      .update({ photo_path: null })
      .eq("id", own.id)
      .select(OWNER_PROFILE_COLUMNS)
      .single();
    const result = toMyProfileResult(supabase, REMOVE_PHOTO_OPERATION, response);
    if (result.ok && previousPath !== null) {
      await removePhotoBestEffort(supabase, previousPath, REMOVE_PHOTO_OPERATION);
    }
    return result;
  });
}

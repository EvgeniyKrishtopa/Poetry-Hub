import "server-only";

import type { ImageType, NameField, ProfileRowPatch, ProfileWriteResult } from "../model/author.types";

// Every write runs with the cookie client as the signed-in owner; the database functions resolve the
// caller, so none of these takes a user id (design D3).

/** Ensures the owner's row exists (`ensure_my_author_profile()`), then updates it by id. */
export async function writeOwnProfile(patch: ProfileRowPatch): Promise<ProfileWriteResult> {
  void patch;
  throw new Error("not implemented");
}

/** Clears one text field; clearing about also resets the alignment (FR-10). */
export async function clearProfileField(field: NameField | "about"): Promise<ProfileWriteResult> {
  void field;
  throw new Error("not implemented");
}

/** Uploads the new photo, points the row at it, then removes the old file (design D4). */
export async function replacePhoto(file: File, type: ImageType): Promise<ProfileWriteResult> {
  void file;
  void type;
  throw new Error("not implemented");
}

/** Clears the photo path, then removes the file best-effort (design D3). */
export async function removePhoto(): Promise<ProfileWriteResult> {
  throw new Error("not implemented");
}

import "server-only";

import type { ImageType, NameField, ProfileRowPatch, ProfileWriteResult } from "../model/author.types";

/** Ensures the owner's row exists, then updates it with the patch (design D3). */
export async function writeOwnProfile(userId: string, patch: ProfileRowPatch): Promise<ProfileWriteResult> {
  void userId;
  void patch;
  throw new Error("not implemented");
}

/** Clears one text field; clearing about also resets the alignment (FR-10). */
export async function clearProfileField(userId: string, field: NameField | "about"): Promise<ProfileWriteResult> {
  void userId;
  void field;
  throw new Error("not implemented");
}

/** Uploads the new photo, points the row at it, then removes the old file (design D4). */
export async function replacePhoto(userId: string, file: File, type: ImageType): Promise<ProfileWriteResult> {
  void userId;
  void file;
  void type;
  throw new Error("not implemented");
}

/** Clears the photo path, then removes the file best-effort (design D3). */
export async function removePhoto(userId: string): Promise<ProfileWriteResult> {
  void userId;
  throw new Error("not implemented");
}

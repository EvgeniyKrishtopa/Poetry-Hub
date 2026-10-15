"use server";

import { updateTag } from "next/cache";
import { returnValidationErrors } from "next-safe-action";

import { getCurrentUserId } from "@/features/auth";

import { clearProfileField, removePhoto, replacePhoto, writeOwnProfile } from "../dal/author-profile-writes";
import { AUTHORS_TAG, authorTag } from "../model/author-cache-tags";
import { PHOTO_FILE_ERROR_MESSAGES } from "../model/author-messages";
import {
  deleteProfileFieldSchema,
  saveAboutSchema,
  saveNameSchema,
  savePhotoSchema,
} from "../model/author-profile.schema";
import type { ProfileActionResult, ProfileWriteResult } from "../model/author.types";
import { validatePhotoFile } from "../model/validate-photo-file";

import { authorsActionClient } from "./action-client";

// Each action resolves the user from the session, never from input (NFR-2), and on success
// expires the directory's and the author's cache tags (FR-17).

const UNAUTHENTICATED = { status: "failed", failure: "unauthenticated" } as const;

/** Decides `unauthenticated` before any I/O; the DAL itself then runs as the session's user. */
async function isSignedOut(): Promise<boolean> {
  return (await getCurrentUserId()) === null;
}

/** The DAL write and, on success, the cache expiry every action shares (design D3). */
async function writeAndExpire(write: () => Promise<ProfileWriteResult>): Promise<ProfileActionResult> {
  const result = await write();
  if (!result.ok) return { status: "failed", failure: result.failure };

  // `updateTag`, not `revalidateTag`: the action's own re-render must already read the new data.
  updateTag(AUTHORS_TAG);
  // A `null` profile is a row with no content left, or no row at all. Either way it held no name
  // before this write either (one write clears one field), so it had no public page to expire.
  if (result.profile !== null) updateTag(authorTag(result.profile.id));
  return { status: "saved", profile: result.profile };
}

async function runOwnerWrite(write: () => Promise<ProfileWriteResult>): Promise<ProfileActionResult> {
  return (await isSignedOut()) ? UNAUTHENTICATED : writeAndExpire(write);
}

export const saveNameAction = authorsActionClient
  .inputSchema(saveNameSchema)
  .action(async ({ parsedInput: { field, value } }): Promise<ProfileActionResult> =>
    runOwnerWrite(() => writeOwnProfile({ [field]: value })),
  );

export const saveAboutAction = authorsActionClient
  .inputSchema(saveAboutSchema)
  .action(async ({ parsedInput: { about, align } }): Promise<ProfileActionResult> =>
    runOwnerWrite(() => writeOwnProfile({ about, about_align: align })),
  );

export const savePhotoAction = authorsActionClient
  .inputSchema(savePhotoSchema)
  .action(async ({ parsedInput: { photo } }): Promise<ProfileActionResult> => {
    // The session first, so a signed-out caller never makes the server read the file.
    if (await isSignedOut()) return UNAUTHENTICATED;

    // The browser ran the same check, but an action is a public endpoint (design D4). The stored
    // type comes from the file's bytes, whatever `photo.type` claims (FR-8).
    const check = await validatePhotoFile(photo);
    if (!check.ok) {
      return returnValidationErrors(savePhotoSchema, { photo: { _errors: [PHOTO_FILE_ERROR_MESSAGES[check.error]] } });
    }
    return writeAndExpire(() => replacePhoto(photo, check.type));
  });

export const deleteProfileFieldAction = authorsActionClient
  .inputSchema(deleteProfileFieldSchema)
  .action(async ({ parsedInput: { field } }): Promise<ProfileActionResult> =>
    runOwnerWrite(() => (field === "photo" ? removePhoto() : clearProfileField(field))),
  );

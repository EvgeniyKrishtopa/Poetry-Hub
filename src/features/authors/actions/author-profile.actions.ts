"use server";

import { updateTag } from "next/cache";
import { returnValidationErrors } from "next-safe-action";

import { getSessionState } from "@/features/auth";
import { SESSION_STATE } from "@/shared/config/constants";

import { clearProfileField, removePhoto, replacePhoto, writeOwnProfile } from "../dal/author-profile-writes";
import { consumeWriteAllowance } from "../dal/write-allowance";
import { AUTHORS_TAG, authorTag } from "../model/author-cache-tags";
import { ACTION_STATUS, WRITE_SCOPES } from "../model/author.constants";
import { PHOTO_FILE_ERROR_MESSAGES } from "../model/author-messages";
import {
  deleteProfileFieldSchema,
  saveAboutSchema,
  saveNameSchema,
  savePhotoSchema,
} from "../model/author-profile.schema";
import type { ProfileActionResult, ProfileWriteResult, WriteAccess, WriteScope } from "../model/author.types";
import { validatePhotoFile } from "../model/validate-photo-file";

import { authorsActionClient } from "./action-client";

// Each action resolves the user from the session, never from input (NFR-2), counts against the
// caller's write limit (FR-21), and on success expires the directory's and the author's cache tags (FR-17).

const WRITE_ALLOWED: WriteAccess = { ok: true };
const UNAUTHENTICATED: WriteAccess = {
  ok: false,
  result: { status: ACTION_STATUS.failed, failure: "unauthenticated" },
};
const UNAVAILABLE: WriteAccess = { ok: false, result: { status: ACTION_STATUS.failed, failure: "unavailable" } };

/**
 * Decided from the session before any I/O; the DAL then runs as the session's user. A session that
 * can't be checked gets the outage message, not "expired" (FR-20).
 */
async function checkWriteAccess(): Promise<WriteAccess> {
  const { state } = await getSessionState();
  if (state === SESSION_STATE.signedIn) return WRITE_ALLOWED;
  return state === SESSION_STATE.signedOut ? UNAUTHENTICATED : UNAVAILABLE;
}

/** The DAL write and, on success, the cache expiry every action shares (design D3). */
async function writeAndExpire(write: () => Promise<ProfileWriteResult>): Promise<ProfileActionResult> {
  const result = await write();
  if (!result.ok) return { status: ACTION_STATUS.failed, failure: result.failure };

  // `updateTag`, not `revalidateTag`: the action's own re-render must already read the new data.
  updateTag(AUTHORS_TAG);
  // A `null` profile is a row with no content left, or no row at all. Either way it held no name
  // before this write either (one write clears one field), so it had no public page to expire.
  if (result.profile !== null) updateTag(authorTag(result.profile.id));
  return { status: ACTION_STATUS.saved, profile: result.profile };
}

/**
 * The session, then one attempt counted against the caller's write limit for `scope` (FR-21, design D13),
 * both before any other I/O. An attempt over the limit writes nothing, so it expires no cache tag.
 */
async function admitOwnerWrite(scope: WriteScope): Promise<WriteAccess> {
  const access = await checkWriteAccess();
  if (!access.ok) return access;
  const allowance = await consumeWriteAllowance(scope);
  if (!allowance.ok) return { ok: false, result: { status: ACTION_STATUS.failed, failure: allowance.failure } };
  return WRITE_ALLOWED;
}

async function runOwnerWrite(write: () => Promise<ProfileWriteResult>): Promise<ProfileActionResult> {
  const access = await admitOwnerWrite(WRITE_SCOPES.profileWrite);
  if (!access.ok) return access.result;
  return writeAndExpire(write);
}

export const saveNameAction = authorsActionClient
  .inputSchema(saveNameSchema)
  .action(async ({ parsedInput: { field, value } }): Promise<ProfileActionResult> =>
    runOwnerWrite(() => writeOwnProfile({ [field]: value })),
  );

export const saveAboutAction = authorsActionClient
  .inputSchema(saveAboutSchema)
  .action(async ({ parsedInput: { about } }): Promise<ProfileActionResult> =>
    runOwnerWrite(() => writeOwnProfile({ about })),
  );

export const savePhotoAction = authorsActionClient
  .inputSchema(savePhotoSchema)
  .action(async ({ parsedInput: { photo } }): Promise<ProfileActionResult> => {
    // The session and the upload limit first, so neither a signed-out nor an over-limit caller makes the
    // server read the file. A file that then fails the content check has used its attempt (FR-21).
    const access = await admitOwnerWrite(WRITE_SCOPES.photoUpload);
    if (!access.ok) return access.result;

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

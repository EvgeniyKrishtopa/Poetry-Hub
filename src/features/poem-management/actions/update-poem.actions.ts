"use server";

import { getSessionState } from "@/features/auth";
import { getOwnPublicAuthor } from "@/features/authors";
import { SESSION_STATE } from "@/shared/config/constants";

import { removeIllustrationBestEffort } from "../dal/illustration-cleanup";
import { consumePoemEditAllowance } from "../dal/poem-edit-allowance";
import { updateOwnPoem } from "../dal/poem-update";
import { isPoemId } from "../model/delete-poem.schema";
import {
  poemFormSchema,
  toPoemFieldErrors,
  type UpdatePoemInput,
  updatePoemInputSchema,
} from "../model/poem-form.schema";
import { POEM_FIELD_ERRORS } from "../model/poem-management-messages";
import { ILLUSTRATION_CHANGE, UPDATE_POEM_STATUS } from "../model/poem-management.constants";
import type {
  PoemFieldErrors,
  UpdateOwnPoemInput,
  UpdatePoemFailure,
  UpdatePoemResult,
} from "../model/poem-management.types";

import { poemManagementActionClient } from "./action-client";
import { expirePoemsTag } from "./expire-poems-tag";
import { checkGenre, checkIllustrationFile } from "./poem-field-checks";

// The owner is resolved from the session, never from input (NFR-1). The limit runs before any other I/O, so a
// blocked attempt reads no profile, calls no Contentful, reads no file, and uploads nothing (FR-7). Only a
// saved poem expires a cache tag (FR-14).

const NOT_FOUND: UpdatePoemResult = { status: UPDATE_POEM_STATUS.notFound };

function failed(failure: UpdatePoemFailure): UpdatePoemResult {
  return { status: UPDATE_POEM_STATUS.failed, failure };
}

function invalid(fieldErrors: PoemFieldErrors): UpdatePoemResult {
  return { status: UPDATE_POEM_STATUS.invalid, fieldErrors };
}

type RequestedIllustration =
  | { readonly kind: typeof ILLUSTRATION_CHANGE.keep }
  | { readonly kind: typeof ILLUSTRATION_CHANGE.remove }
  | { readonly kind: typeof ILLUSTRATION_CHANGE.replace; readonly file: File };

/**
 * What the save asks for the illustration, or `null` for a replace without a non-empty file (the form never
 * sends one). `keep` and `remove` ignore any file sent with them.
 */
function requestedIllustration(input: UpdatePoemInput): RequestedIllustration | null {
  if (input.illustrationChange !== ILLUSTRATION_CHANGE.replace) return { kind: input.illustrationChange };
  if (input.illustration === undefined || input.illustration.size === 0) return null;
  return { kind: ILLUSTRATION_CHANGE.replace, file: input.illustration };
}

/** Why the session can't write, or `null` when it is signed in. */
async function sessionFailure(): Promise<UpdatePoemFailure | null> {
  const { state } = await getSessionState();
  if (state === SESSION_STATE.signedIn) return null;
  // A session that can't be checked gets the outage message, not "expired".
  return state === SESSION_STATE.signedOut ? "unauthenticated" : "unavailable";
}

type IllustrationResolution =
  | { readonly ok: true; readonly illustration: UpdateOwnPoemInput["illustration"] }
  | { readonly ok: false; readonly result: UpdatePoemResult };

/** `keep` and `remove` read no file; a replacement is checked by size and sniffed type (design D3 step 7). */
async function resolveIllustration(requested: RequestedIllustration): Promise<IllustrationResolution> {
  if (requested.kind !== ILLUSTRATION_CHANGE.replace) return { ok: true, illustration: requested };
  const check = await checkIllustrationFile(requested.file);
  if (!check.ok) return { ok: false, result: check.result };
  return { ok: true, illustration: { kind: ILLUSTRATION_CHANGE.replace, file: check.illustration } };
}

/** The steps of design D3, in order; each failure stops the rest. */
async function updatePoem(input: UpdatePoemInput): Promise<UpdatePoemResult> {
  // 1. A malformed id names no poem: nothing else runs.
  if (!isPoemId(input.poemId)) return NOT_FOUND;

  // 2. Field rules: the same schema the form runs in the browser. Nothing is counted yet.
  const parsed = poemFormSchema.safeParse(input);
  const requested = requestedIllustration(input);
  if (!parsed.success || requested === null) {
    return invalid({
      ...(parsed.success ? {} : toPoemFieldErrors(parsed.error)),
      ...(requested === null ? { illustration: POEM_FIELD_ERRORS.required } : {}),
    });
  }
  const form = parsed.data;

  // 3. Session.
  const session = await sessionFailure();
  if (session !== null) return failed(session);

  // 4. The limit, before any other I/O. From here every attempt has counted, as in the profile editor.
  const allowance = await consumePoemEditAllowance();
  if (!allowance.ok) return failed(allowance.failure);

  // 5. The author id: the upload folder and the cache tag. The edit page is a 404 for a non-public profile,
  //    so only a profile changed in another tab gets here; the alert names the fix.
  const author = await getOwnPublicAuthor();
  if (!author.ok) return failed(author.failure);
  if (author.status === "not-public") return failed("not-public");

  // 6. Genre, 7. illustration.
  const genre = await checkGenre(form.genreId);
  if (!genre.ok) return genre.result;
  const illustration = await resolveIllustration(requested);
  if (!illustration.ok) return illustration.result;

  // 8. Upload, then the row; another author's poem and a missing one are the same not-found.
  const updated = await updateOwnPoem({
    authorId: author.authorId,
    poemId: input.poemId,
    title: form.title,
    text: form.text,
    genreId: genre.genreId,
    illustration: illustration.illustration,
  });
  if (!updated.ok) return failed(updated.failure);
  if (updated.status === "not-found") return NOT_FOUND;

  // 9. The row is saved: the author's pages must show it. Then the old file, after the row no longer points
  //    at it. Both only log a failure: the save already happened.
  expirePoemsTag(author.authorId);
  if (updated.replacedPath !== null) await removeIllustrationBestEffort(updated.replacedPath);

  // 10.
  return { status: UPDATE_POEM_STATUS.saved };
}

/** Saves an edit of one of the caller's own poems (edit-poem design D3). */
export const updatePoemAction = poemManagementActionClient
  .inputSchema(updatePoemInputSchema)
  .action(async ({ parsedInput }): Promise<UpdatePoemResult> => updatePoem(parsedInput));

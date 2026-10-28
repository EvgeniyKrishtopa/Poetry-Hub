"use server";

import { updateTag } from "next/cache";

import { getSessionState } from "@/features/auth";
import { getOwnPublicAuthor } from "@/features/authors";
import { listPoemGenres, poemsTag } from "@/features/poems";
import { SESSION_STATE } from "@/shared/config/constants";
import { validateImageFile } from "@/shared/lib/image-file/validate-image-file";

import { checkCanCreatePoem, createOwnPoem } from "../dal/poem-writes";
import {
  type CreatePoemInput,
  createPoemInputSchema,
  poemFormSchema,
  toPoemFieldErrors,
} from "../model/poem-form.schema";
import { ILLUSTRATION_ERROR_MESSAGES, POEM_FIELD_ERRORS } from "../model/poem-management-messages";
import { CREATE_POEM_STATUS } from "../model/poem-management.constants";
import type { CreatePoemFailure, CreatePoemResult, PoemFieldErrors, PoemIllustration } from "../model/poem-management.types";

import { poemManagementActionClient } from "./action-client";

// The user and the author are resolved from the session, never from input (NFR-1). The limit check runs
// before any other I/O, so a blocked attempt reads no profile, calls no Contentful, and uploads nothing
// (FR-6). Only a created poem expires a cache tag (FR-12).

function failed(failure: CreatePoemFailure): CreatePoemResult {
  return { status: CREATE_POEM_STATUS.failed, failure };
}

function invalid(fieldErrors: PoemFieldErrors): CreatePoemResult {
  return { status: CREATE_POEM_STATUS.invalid, fieldErrors };
}

/** Why the session can't write, or `null` when it is signed in. */
async function sessionFailure(): Promise<CreatePoemFailure | null> {
  const { state } = await getSessionState();
  if (state === SESSION_STATE.signedIn) return null;
  // A session that can't be checked gets the outage message, not "expired".
  return state === SESSION_STATE.signedOut ? "unauthenticated" : "unavailable";
}

type GenreCheck = { readonly ok: true; readonly genreId: string | null } | { readonly ok: false; readonly result: CreatePoemResult };

/** The no-genre option is `null`; any other id must still be in the cached genre list (design D7 step 5). */
async function checkGenre(genreId: string | null): Promise<GenreCheck> {
  if (genreId === null) return { ok: true, genreId };

  const genres = await listPoemGenres();
  if (!genres.ok) return { ok: false, result: failed("unavailable") };
  if (!genres.genres.some((genre) => genre.id === genreId)) {
    return { ok: false, result: invalid({ genreId: POEM_FIELD_ERRORS.genreUnavailable }) };
  }
  return { ok: true, genreId };
}

type IllustrationCheck =
  | { readonly ok: true; readonly illustration: PoemIllustration | null }
  | { readonly ok: false; readonly result: CreatePoemResult };

/** No file, or an empty one, is no illustration; any other is checked by size and content (design D7 step 6). */
async function checkIllustration(file: File | undefined): Promise<IllustrationCheck> {
  if (file === undefined || file.size === 0) return { ok: true, illustration: null };

  const check = await validateImageFile(file);
  if (!check.ok) return { ok: false, result: invalid({ illustration: ILLUSTRATION_ERROR_MESSAGES[check.error] }) };
  return { ok: true, illustration: { file, type: check.type } };
}

/** The steps of design D7, in order; each failure stops the rest. */
async function createPoem(input: CreatePoemInput): Promise<CreatePoemResult> {
  // 1. Field rules: the same schema the form runs in the browser.
  const form = poemFormSchema.safeParse(input);
  if (!form.success) return invalid(toPoemFieldErrors(form.error));

  // 2. Session.
  const session = await sessionFailure();
  if (session !== null) return failed(session);

  // 3. The limit, before any other I/O. The form is offered only to a public profile, so not-public here
  //    means a bypassed form: the generic failure.
  const allowance = await checkCanCreatePoem();
  if (!allowance.ok) return failed(allowance.failure);
  if (allowance.status === "over-limit") return failed("too-many-poems");
  if (allowance.status === "not-public") return failed("unknown");

  // 4. The author id: the upload folder and the cache tag.
  const author = await getOwnPublicAuthor();
  if (!author.ok) return failed(author.failure);
  if (author.status === "not-public") return failed("unknown");

  // 5. Genre, 6. illustration.
  const genre = await checkGenre(form.data.genreId);
  if (!genre.ok) return genre.result;
  const illustration = await checkIllustration(input.illustration);
  if (!illustration.ok) return illustration.result;

  // 7. Upload and insert.
  const created = await createOwnPoem({
    authorId: author.authorId,
    title: form.data.title,
    text: form.data.text,
    genreId: genre.genreId,
    illustration: illustration.illustration,
  });
  if (!created.ok) return failed(created.failure);

  // 8. `updateTag`, not `revalidateTag`: the next request for any of the author's poem pages must wait
  //    for the new list.
  updateTag(poemsTag(author.authorId));
  return { status: CREATE_POEM_STATUS.created, poemId: created.poemId };
}

/** Creates one poem for the caller's own public profile (design D7). */
export const createPoemAction = poemManagementActionClient
  .inputSchema(createPoemInputSchema)
  .action(async ({ parsedInput }): Promise<CreatePoemResult> => createPoem(parsedInput));

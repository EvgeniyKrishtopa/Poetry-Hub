"use server";

import { getSessionState } from "@/features/auth";
import { getOwnPublicAuthor } from "@/features/authors";
import { SESSION_STATE } from "@/shared/config/constants";

import { checkCanCreatePoem, createOwnPoem } from "../dal/poem-writes";
import {
  type CreatePoemInput,
  createPoemInputSchema,
  poemFormSchema,
  toPoemFieldErrors,
} from "../model/poem-form.schema";
import { CREATE_POEM_STATUS } from "../model/poem-management.constants";
import type { CreatePoemFailure, CreatePoemResult, PoemFieldErrors } from "../model/poem-management.types";

import { poemManagementActionClient } from "./action-client";
import { expirePoemsTag } from "./expire-poems-tag";
import { checkGenre, checkIllustration } from "./poem-field-checks";

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

  // 8. The poem is stored: a failed expiry is only logged, never an error the author would retry into a
  //    duplicate.
  expirePoemsTag(author.authorId);
  return { status: CREATE_POEM_STATUS.created, poemId: created.poemId };
}

/** Creates one poem for the caller's own public profile (design D7). */
export const createPoemAction = poemManagementActionClient
  .inputSchema(createPoemInputSchema)
  .action(async ({ parsedInput }): Promise<CreatePoemResult> => createPoem(parsedInput));

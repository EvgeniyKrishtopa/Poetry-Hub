import "server-only";

import { listPoemGenres } from "@/features/poems";
import { validateImageFile } from "@/shared/lib/image-file/validate-image-file";

import { ILLUSTRATION_ERROR_MESSAGES, POEM_FIELD_ERRORS } from "../model/poem-management-messages";
import type { PoemFieldErrors, PoemIllustration } from "../model/poem-management.types";

// The checks the field rules can't run in the browser, shared by the create and the update action. Their
// failures use the `status` values both actions' results share, so each action returns them as they are.

/** A check's failure, already in the shape of both actions' `invalid` and `failed` results. */
type FieldCheckFailure =
  | { readonly status: "invalid"; readonly fieldErrors: PoemFieldErrors }
  | { readonly status: "failed"; readonly failure: "unavailable" };

type GenreCheck = { readonly ok: true; readonly genreId: string | null } | { readonly ok: false; readonly result: FieldCheckFailure };

/** The no-genre option is `null`; any other id must still be in the cached genre list. */
export async function checkGenre(genreId: string | null): Promise<GenreCheck> {
  if (genreId === null) return { ok: true, genreId };

  const genres = await listPoemGenres();
  if (!genres.ok) return { ok: false, result: { status: "failed", failure: "unavailable" } };
  if (!genres.genres.some((genre) => genre.id === genreId)) {
    return { ok: false, result: { status: "invalid", fieldErrors: { genreId: POEM_FIELD_ERRORS.genreUnavailable } } };
  }
  return { ok: true, genreId };
}

type IllustrationCheck =
  | { readonly ok: true; readonly illustration: PoemIllustration | null }
  | { readonly ok: false; readonly result: FieldCheckFailure };

type IllustrationFileCheck =
  | { readonly ok: true; readonly illustration: PoemIllustration }
  | { readonly ok: false; readonly result: FieldCheckFailure };

/** A non-empty file, checked by size and content. */
export async function checkIllustrationFile(file: File): Promise<IllustrationFileCheck> {
  const check = await validateImageFile(file);
  if (!check.ok) {
    return { ok: false, result: { status: "invalid", fieldErrors: { illustration: ILLUSTRATION_ERROR_MESSAGES[check.error] } } };
  }
  return { ok: true, illustration: { file, type: check.type } };
}

/** No file, or an empty one, is no illustration; any other is checked by size and content. */
export async function checkIllustration(file: File | undefined): Promise<IllustrationCheck> {
  if (file === undefined || file.size === 0) return { ok: true, illustration: null };
  return checkIllustrationFile(file);
}

import type { Poem, PoemGenre } from "@/features/poems";
import type { ImageDraft } from "@/shared/lib/image-file/image-file.types";

import { normalizeText, normalizeTitle } from "./poem-form.schema";
import { GENRE_PLACEHOLDER, ILLUSTRATION_CHANGE, NO_GENRE } from "./poem-management.constants";
import type { IllustrationChange } from "./poem-management.types";

/** The illustration as the form holds it (edit-poem design D5). */
export type IllustrationState =
  | { readonly kind: "stored"; readonly url: string }
  | { readonly kind: "none" }
  | { readonly kind: "new"; readonly draft: ImageDraft };

/** The four fields as the form holds them: raw text, the dropdown's value, the illustration state. */
export interface PoemFormValues {
  readonly title: string;
  readonly text: string;
  readonly genreId: string;
  readonly illustration: IllustrationState;
}

/**
 * Whether saving `draft` would store something other than `stored` (edit-poem design D5). Title and text
 * are compared as the schema would store them. The illustration counts by its kind alone: the stored one is
 * never re-picked as `stored`, and a newly picked file is always a change, since the browser can't compare
 * its bytes with the stored file.
 */
export function isPoemFormChanged(stored: PoemFormValues, draft: PoemFormValues): boolean {
  return (
    normalizeTitle(draft.title) !== normalizeTitle(stored.title) ||
    normalizeText(draft.text) !== normalizeText(stored.text) ||
    draft.genreId !== stored.genreId ||
    draft.illustration.kind !== stored.illustration.kind
  );
}

/** The dropdown's value for a stored genre: the no-genre option for none, the placeholder for one no longer offered (FR-2). */
function storedGenreValue(genreId: string | null, genres: readonly PoemGenre[]): string {
  if (genreId === null) return NO_GENRE;
  return genres.some((genre) => genre.id === genreId) ? genreId : GENRE_PLACEHOLDER;
}

/** The values the edit page opens with (edit-poem design D6). */
export function storedFormValues(poem: Poem, genres: readonly PoemGenre[]): PoemFormValues {
  return {
    title: poem.title,
    text: poem.text,
    genreId: storedGenreValue(poem.genreId, genres),
    illustration: poem.illustrationUrl === null ? { kind: "none" } : { kind: "stored", url: poem.illustrationUrl },
  };
}

/** What a save asks for the illustration: the shown state decides; `none` with nothing stored removes nothing. */
export function illustrationChangeOf(illustration: IllustrationState): IllustrationChange {
  switch (illustration.kind) {
    case "stored":
      return ILLUSTRATION_CHANGE.keep;
    case "none":
      return ILLUSTRATION_CHANGE.remove;
    case "new":
      return ILLUSTRATION_CHANGE.replace;
  }
}

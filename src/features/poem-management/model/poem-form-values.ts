import type { ImageDraft } from "@/shared/lib/image-file/image-file.types";

import { normalizeText, normalizeTitle } from "./poem-form.schema";

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

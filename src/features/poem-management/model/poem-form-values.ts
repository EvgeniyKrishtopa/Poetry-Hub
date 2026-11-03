import type { ImageDraft } from "@/shared/lib/image-file/image-file.types";

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

/** Whether saving `draft` would store something other than `stored` (edit-poem design D5). */
export function isPoemFormChanged(stored: PoemFormValues, draft: PoemFormValues): boolean {
  void stored;
  void draft;
  throw new Error("not implemented");
}

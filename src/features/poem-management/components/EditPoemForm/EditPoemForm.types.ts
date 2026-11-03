import type { PoemGenre } from "@/features/poems";

import type { PoemFormValues } from "../../model/poem-form-values";

export interface EditPoemFormProps {
  readonly poemId: string;
  /** The values the page opened with: what change detection and discard compare against (design D5, D6). */
  readonly stored: PoemFormValues;
  readonly genres: readonly PoemGenre[];
}

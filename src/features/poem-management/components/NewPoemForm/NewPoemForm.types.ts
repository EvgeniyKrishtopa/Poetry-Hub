import type { PoemGenre } from "@/features/poems";

import type { PoemFormField } from "../../model/poem-management.types";

export interface NewPoemFormProps {
  /** Sorted by Russian name; the form adds the placeholder before and the no-genre option after. */
  readonly genres: readonly PoemGenre[];
}

/** Where focus goes once the form is enabled again: the first invalid field, or the failure alert (NFR-7). */
export interface FocusRequest {
  readonly target: PoemFormField | "alert";
}

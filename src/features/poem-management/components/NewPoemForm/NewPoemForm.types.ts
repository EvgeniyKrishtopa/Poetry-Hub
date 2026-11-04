import type { PoemGenre } from "@/features/poems";

export interface NewPoemFormProps {
  /** Sorted by Russian name; the form adds the placeholder before and the no-genre option after. */
  readonly genres: readonly PoemGenre[];
}

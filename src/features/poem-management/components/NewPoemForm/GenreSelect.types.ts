import type { PoemGenre } from "@/features/poems";

export interface GenreSelectProps {
  readonly id: string;
  /** The selected option's value: the placeholder, a genre id, or the no-genre option. */
  readonly value: string;
  /** Sorted by Russian name; shown between the placeholder and the no-genre option. */
  readonly genres: readonly PoemGenre[];
  readonly error: string | undefined;
  readonly onChange: (value: string) => void;
}

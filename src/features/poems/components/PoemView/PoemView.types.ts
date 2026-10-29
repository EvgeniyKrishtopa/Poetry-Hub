import type { Poem, PoemGenreName } from "../../model/poem.types";

export interface PoemViewProps {
  readonly poem: Poem;
  /** The footer's genre line, read by the page from the current Contentful list; `none` leaves it out. */
  readonly genre: PoemGenreName;
}

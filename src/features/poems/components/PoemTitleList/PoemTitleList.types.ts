import type { Poem } from "../../model/poem.types";

export interface PoemTitleListProps {
  /** Shown in the given order; the caller handles an empty list, which differs per page. */
  readonly poems: readonly Poem[];
  /** Where a poem's title links to: the public poem page or the owner's. */
  readonly poemHref: (poemId: string) => string;
}

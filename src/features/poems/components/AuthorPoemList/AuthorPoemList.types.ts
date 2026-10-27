import type { Poem } from "../../model/poem.types";

export interface AuthorPoemListProps {
  readonly authorId: string;
  /** Newest first, as `listAuthorPoems` returns them. */
  readonly poems: readonly Poem[];
}

import type { AuthorPoemsResult } from "../../model/poem.types";

export interface AuthorPoemListProps {
  readonly authorId: string;
  /** As `listAuthorPoems` returns it: the poems newest first, or `unavailable`. */
  readonly result: AuthorPoemsResult;
}

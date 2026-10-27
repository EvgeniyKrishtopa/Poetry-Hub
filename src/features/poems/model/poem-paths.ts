import { authorPagePath } from "@/features/authors";

import { POEMS_SEGMENT } from "./poem.constants";

/** One poem of an author, `/authors/<id>/poems/<poemId>`. */
export function authorPoemPath(authorId: string, poemId: string): string {
  return `${authorPagePath(authorId)}/${POEMS_SEGMENT}/${poemId}`;
}

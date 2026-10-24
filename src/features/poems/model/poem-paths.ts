import { authorPagePath } from "@/features/authors";

import { POEMS_SEGMENT } from "./poem.constants";

/** An author's poem list, `/authors/<id>/poems`. */
export function authorPoemsPath(authorId: string): string {
  return `${authorPagePath(authorId)}/${POEMS_SEGMENT}`;
}

/** One poem of an author, `/authors/<id>/poems/<poemId>`. */
export function authorPoemPath(authorId: string, poemId: string): string {
  return `${authorPoemsPath(authorId)}/${poemId}`;
}

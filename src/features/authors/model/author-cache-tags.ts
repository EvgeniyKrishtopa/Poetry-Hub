/** The directory's cache tag. */
export const AUTHORS_TAG = "authors";

const AUTHOR_TAG_PREFIX = "author:";

/** One author's cache tag. */
export function authorTag(id: string): string {
  return `${AUTHOR_TAG_PREFIX}${id}`;
}

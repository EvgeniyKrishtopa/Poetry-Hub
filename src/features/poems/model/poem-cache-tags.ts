const POEMS_TAG_PREFIX = "poems:";

/** The one cache tag of an author's poems, `poems:<authorId>`: a create expires it (design D3). */
export function poemsTag(authorId: string): string {
  return `${POEMS_TAG_PREFIX}${authorId}`;
}

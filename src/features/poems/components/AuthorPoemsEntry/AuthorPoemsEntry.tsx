import { CONTENT_LANG } from "@/shared/config/constants";

import { listAuthorPoems } from "../../dal/author-poems";
import { authorPoemPath } from "../../model/poem-paths";
import { NO_POEMS_TEXT, POEMS_PAGE_TITLE, POEMS_UNAVAILABLE_TEXT } from "../../model/poems-messages";
import { uncollectedPoems } from "../../model/uncollected-poems";
import { PoemTitleList } from "../PoemTitleList/PoemTitleList";

import type { AuthorPoemsEntryProps } from "./AuthorPoemsEntry.types";

/**
 * The author page's last block: the poems section heading (h2) over the author's free poem titles (those in no
 * collection) newest first, the empty text, or the unavailable text (the page still renders). Nothing when every poem
 * is in a collection (public-collections D3). An h2, because the page's h1 is the author's name. It reads no session,
 * so every visitor sees the same list.
 */
export async function AuthorPoemsEntry({ authorId }: AuthorPoemsEntryProps) {
  const id = await authorId;
  const result = await listAuthorPoems(id);

  const freePoems = result.ok ? uncollectedPoems(result.poems) : [];
  if (result.ok && result.poems.length > 0 && freePoems.length === 0) return null;

  return (
    <section lang={CONTENT_LANG} className="flex flex-col gap-4">
      <h2 className="text-2xl font-semibold tracking-[-0.01em]">{POEMS_PAGE_TITLE}</h2>
      {freePoems.length > 0 ? (
        <PoemTitleList poems={freePoems} poemHref={(poemId) => authorPoemPath(id, poemId)} />
      ) : (
        <p className="text-muted">{result.ok ? NO_POEMS_TEXT : POEMS_UNAVAILABLE_TEXT}</p>
      )}
    </section>
  );
}

import { CONTENT_LANG } from "@/shared/config/constants";

import { listAuthorPoems } from "../../dal/author-poems";
import { authorPoemPath } from "../../model/poem-paths";
import { NO_POEMS_TEXT, POEMS_PAGE_TITLE, POEMS_UNAVAILABLE_TEXT } from "../../model/poems-messages";
import { PoemTitleList } from "../PoemTitleList/PoemTitleList";

import type { AuthorPoemsEntryProps } from "./AuthorPoemsEntry.types";

/**
 * The author page's last block: the poems section heading (h2) over the author's poem titles newest first, the
 * empty text, or the unavailable text (the page still renders). An h2, because the page's h1 is the
 * author's name. It reads no session, so every visitor sees the same list.
 */
export async function AuthorPoemsEntry({ authorId }: AuthorPoemsEntryProps) {
  const id = await authorId;
  const result = await listAuthorPoems(id);

  const hasPoems = result.ok && result.poems.length > 0;

  return (
    <section lang={CONTENT_LANG} className="flex flex-col gap-4">
      <h2 className="text-2xl font-semibold tracking-[-0.01em]">{POEMS_PAGE_TITLE}</h2>
      {hasPoems ? (
        <PoemTitleList poems={result.poems} poemHref={(poemId) => authorPoemPath(id, poemId)} />
      ) : (
        <p className="text-muted">{result.ok ? NO_POEMS_TEXT : POEMS_UNAVAILABLE_TEXT}</p>
      )}
    </section>
  );
}

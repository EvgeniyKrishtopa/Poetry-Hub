import Link from "next/link";

import { CONTENT_LANG } from "@/shared/config/constants";

import { authorPoemPath } from "../../model/poem-paths";
import type { Poem } from "../../model/poem.types";
import { NO_POEMS_TEXT, POEMS_PAGE_TITLE, POEMS_UNAVAILABLE_TEXT } from "../../model/poems-messages";

import type { AuthorPoemListProps } from "./AuthorPoemList.types";

function TitleLinks({ authorId, poems }: { readonly authorId: string; readonly poems: readonly Poem[] }) {
  if (poems.length === 0) return <p className="text-muted">{NO_POEMS_TEXT}</p>;

  return (
    <ul className="flex flex-col gap-3">
      {poems.map((poem) => (
        <li key={poem.id}>
          <Link
            href={authorPoemPath(authorId, poem.id)}
            className="text-lg text-foreground transition-colors duration-150 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {poem.title}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * The author page's poems section: an h2 over title links in the given order, the empty text, or the
 * unavailable text. An h2, because the page's h1 is the author's name.
 */
export function AuthorPoemList({ authorId, result }: AuthorPoemListProps) {
  return (
    <section lang={CONTENT_LANG} className="flex flex-col gap-4">
      <h2 className="text-2xl font-semibold tracking-[-0.01em]">{POEMS_PAGE_TITLE}</h2>
      {result.ok ? (
        <TitleLinks authorId={authorId} poems={result.poems} />
      ) : (
        <p className="text-muted">{POEMS_UNAVAILABLE_TEXT}</p>
      )}
    </section>
  );
}

import Link from "next/link";

import { CONTENT_LANG } from "@/shared/config/constants";

import { authorPoemPath } from "../../model/poem-paths";
import { NO_POEMS_TEXT, POEMS_PAGE_TITLE } from "../../model/poems-messages";

import type { AuthorPoemListProps } from "./AuthorPoemList.types";

/**
 * The author page's poems section: an h2 over title links in the given order, or the empty text. An h2,
 * because the page's h1 is the author's name.
 */
export function AuthorPoemList({ authorId, poems }: AuthorPoemListProps) {
  return (
    <section lang={CONTENT_LANG} className="flex flex-col gap-4">
      <h2 className="text-2xl font-semibold tracking-[-0.01em]">{POEMS_PAGE_TITLE}</h2>
      {poems.length === 0 ? (
        <p className="text-muted">{NO_POEMS_TEXT}</p>
      ) : (
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
      )}
    </section>
  );
}

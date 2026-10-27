import Link from "next/link";

import { CONTENT_LANG } from "@/shared/config/constants";

import { authorPoemPath } from "../../model/poem-paths";
import { NO_POEMS_TEXT, POEMS_PAGE_TITLE } from "../../model/poems-messages";

import type { AuthorPoemListProps } from "./AuthorPoemList.types";

/** The poem list page: the heading over title links in the given order, or the empty text. */
export function AuthorPoemList({ authorId, poems }: AuthorPoemListProps) {
  return (
    <section lang={CONTENT_LANG} className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{POEMS_PAGE_TITLE}</h1>
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

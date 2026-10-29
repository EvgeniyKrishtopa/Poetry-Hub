import Link from "next/link";

import type { PoemTitleListProps } from "./PoemTitleList.types";

/** Poem titles as links, one per line: the author page's poems section and the owner's poem list. */
export function PoemTitleList({ poems, poemHref }: PoemTitleListProps) {
  return (
    <ul className="flex flex-col gap-3">
      {poems.map((poem) => (
        <li key={poem.id}>
          <Link
            href={poemHref(poem.id)}
            className="text-lg text-foreground transition-colors duration-150 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {poem.title}
          </Link>
        </li>
      ))}
    </ul>
  );
}

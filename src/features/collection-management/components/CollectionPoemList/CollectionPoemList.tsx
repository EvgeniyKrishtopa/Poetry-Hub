import Link from "next/link";

import { COLLECTION_POEMS_ON_PAGE_COPY } from "../../model/collection-management-messages";
import { ownPoemPagePath } from "../../model/collection-paths";

import type { CollectionPoemListProps } from "./CollectionPoemList.types";

// One list per collection page.
const HEADING_ID = "collection-poems-heading";

/** The level-2 heading and the collection's poem title links on its page; nothing when it holds no poems (design D4). */
export function CollectionPoemList({ poems }: CollectionPoemListProps) {
  if (poems.length === 0) return null;

  return (
    <section aria-labelledby={HEADING_ID} className="flex flex-col gap-4">
      <h2 id={HEADING_ID} className="text-2xl font-semibold tracking-[-0.01em]">
        {COLLECTION_POEMS_ON_PAGE_COPY.poemsHeading}
      </h2>
      {/* `PoemTitleList`'s look, repeated: that list is `poems`', which this feature doesn't import (NFR-3). */}
      <ul className="flex flex-col gap-3">
        {poems.map((poem) => (
          <li key={poem.id}>
            <Link
              href={ownPoemPagePath(poem.id)}
              className="text-lg text-foreground transition-colors duration-150 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {poem.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

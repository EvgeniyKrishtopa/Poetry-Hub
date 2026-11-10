import Link from "next/link";

import { collectionPath, ownPoemPagePath } from "../../model/collection-paths";

import type { OwnCollectionItemProps } from "./OwnCollectionItem.types";

const LINK_INTERACTION_CLASS =
  "text-foreground transition-colors duration-150 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** One collection of the `/account/poems` section: its title link, and its poems' links nested under it when it has any. */
export function OwnCollectionItem({ collection }: OwnCollectionItemProps) {
  return (
    <li>
      <Link href={collectionPath(collection.id)} className={`text-lg ${LINK_INTERACTION_CLASS}`}>
        {collection.title}
      </Link>
      {collection.poems.length > 0 && (
        <ul className="mt-2 flex flex-col gap-2 border-l border-border pl-4">
          {collection.poems.map((poem) => (
            <li key={poem.id}>
              <Link href={ownPoemPagePath(poem.id)} className={`text-base leading-6 ${LINK_INTERACTION_CLASS}`}>
                {poem.title}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

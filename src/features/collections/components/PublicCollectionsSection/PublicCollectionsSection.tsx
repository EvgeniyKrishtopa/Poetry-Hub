import Link from "next/link";

import { authorPoemPath } from "@/features/poems";
import { CONTENT_LANG } from "@/shared/config/constants";

import { listAuthorCollections } from "../../dal/public-collections";
import { publicCollectionPath } from "../../model/public-collection-paths";
import { PUBLIC_COLLECTIONS_COPY } from "../../model/public-collections-messages";

import type { PublicCollectionsSectionProps } from "./PublicCollectionsSection.types";

const LINK_INTERACTION_CLASS =
  "text-foreground transition-colors duration-150 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/**
 * The author page's collections section: each visible collection with its poems nested under it, the unavailable
 * text, or nothing (public-collections D6). It reads no session, so every visitor sees the same section.
 */
export async function PublicCollectionsSection({ authorId }: PublicCollectionsSectionProps) {
  const id = await authorId;
  const result = await listAuthorCollections(id);

  if (!result.ok) {
    const showsUnavailableText = result.reason === "collections-unavailable" && result.hasCollectedPoems;
    if (!showsUnavailableText) return null;
  } else if (result.collections.length === 0) {
    return null;
  }

  return (
    <section lang={CONTENT_LANG} className="flex flex-col gap-4">
      <h2 className="text-2xl font-semibold tracking-[-0.01em]">{PUBLIC_COLLECTIONS_COPY.sectionHeading}</h2>
      {result.ok ? (
        <ul className="flex flex-col gap-3">
          {result.collections.map((collection) => (
            <li key={collection.id}>
              <Link href={publicCollectionPath(id, collection.id)} className={`text-lg ${LINK_INTERACTION_CLASS}`}>
                {collection.title}
              </Link>
              <ul className="mt-2 flex flex-col gap-2 border-l border-border pl-4">
                {collection.poems.map((poem) => (
                  <li key={poem.id}>
                    <Link href={authorPoemPath(id, poem.id)} className={`text-base leading-6 ${LINK_INTERACTION_CLASS}`}>
                      {poem.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted">{PUBLIC_COLLECTIONS_COPY.sectionUnavailable}</p>
      )}
    </section>
  );
}

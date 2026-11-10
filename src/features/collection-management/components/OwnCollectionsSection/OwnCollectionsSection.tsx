import Link from "next/link";

import { getOwnPublicAuthor } from "@/features/authors";
import { Alert } from "@/shared/ui";

import { listCollectedPoems } from "../../dal/collection-poems";
import { listOwnCollections } from "../../dal/own-collections";
import { COLLECTION_LIST_COPY } from "../../model/collection-management-messages";
import { collectionPath, ownPoemPagePath } from "../../model/collection-paths";

// One section per page, and an async component can't call `useId`.
const HEADING_ID = "own-collections-heading";

const LINK_INTERACTION_CLASS =
  "text-foreground transition-colors duration-150 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/**
 * The collections section on `/account/poems`: each collection's title link with its poems nested under it, nothing
 * when there are no collections, or the failure alert when either read fails (design D3, add-poems-to-collections D10).
 */
export async function OwnCollectionsSection() {
  // Memoized per request: the page's own read already answered this.
  const own = await getOwnPublicAuthor();
  // The page renders this slot only for a public own profile, and shows its own notice otherwise.
  if (!own.ok || own.status === "not-public") return null;

  const [list, collected] = await Promise.all([listOwnCollections(own.authorId), listCollectedPoems()]);
  if (!list.ok || !collected.ok) {
    return (
      <Alert tone="danger" className="self-stretch">
        {COLLECTION_LIST_COPY.sectionUnavailable}
      </Alert>
    );
  }
  if (list.collections.length === 0) return null;

  // The read is newest first, and grouping keeps that order inside each collection.
  const poemsByCollection = Map.groupBy(collected.poems, (poem) => poem.collectionId);

  return (
    <section aria-labelledby={HEADING_ID} className="flex flex-col gap-4 self-stretch">
      <h2 id={HEADING_ID} className="text-2xl font-semibold tracking-[-0.01em]">
        {COLLECTION_LIST_COPY.sectionHeading}
      </h2>
      {/* `PoemTitleList`'s look, repeated: that list is `poems`' and typed for poems (ui-plan). */}
      <ul className="flex flex-col gap-3">
        {list.collections.map((collection) => {
          // A collection with no poems has no group at all, so it shows its title only.
          const poems = poemsByCollection.get(collection.id);
          return (
            <li key={collection.id}>
              <Link href={collectionPath(collection.id)} className={`text-lg ${LINK_INTERACTION_CLASS}`}>
                {collection.title}
              </Link>
              {poems && (
                <ul className="mt-2 flex flex-col gap-2 border-l border-border pl-4">
                  {poems.map((poem) => (
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
        })}
      </ul>
    </section>
  );
}

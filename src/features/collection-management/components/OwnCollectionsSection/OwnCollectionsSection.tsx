import Link from "next/link";

import { getOwnPublicAuthor } from "@/features/authors";
import { Alert } from "@/shared/ui";

import { listOwnCollections } from "../../dal/own-collections";
import { COLLECTION_LIST_COPY } from "../../model/collection-management-messages";
import { collectionPath } from "../../model/collection-paths";

// One section per page, and an async component can't call `useId`.
const HEADING_ID = "own-collections-heading";

/** The collections section on `/account/poems`: list, nothing when empty, or the failure alert (design D3). */
export async function OwnCollectionsSection() {
  // Memoized per request: the page's own read already answered this.
  const own = await getOwnPublicAuthor();
  // The page renders this slot only for a public own profile, and shows its own notice otherwise.
  if (!own.ok || own.status === "not-public") return null;

  const list = await listOwnCollections(own.authorId);
  if (!list.ok) {
    return (
      <Alert tone="danger" className="self-stretch">
        {COLLECTION_LIST_COPY.sectionUnavailable}
      </Alert>
    );
  }
  if (list.collections.length === 0) return null;

  return (
    <section aria-labelledby={HEADING_ID} className="flex flex-col gap-4 self-stretch">
      <h2 id={HEADING_ID} className="text-2xl font-semibold tracking-[-0.01em]">
        {COLLECTION_LIST_COPY.sectionHeading}
      </h2>
      {/* `PoemTitleList`'s look, repeated: that list is `poems`' and typed for poems (ui-plan). */}
      <ul className="flex flex-col gap-3">
        {list.collections.map((collection) => (
          <li key={collection.id}>
            <Link
              href={collectionPath(collection.id)}
              className="text-lg text-foreground transition-colors duration-150 hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {collection.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

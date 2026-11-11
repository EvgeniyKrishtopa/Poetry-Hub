import { Suspense } from "react";

import { PublicCollectionContent } from "../PublicCollectionContent/PublicCollectionContent";
import { PublicCollectionSkeleton } from "../PublicCollectionSkeleton/PublicCollectionSkeleton";

import type { PublicCollectionPageProps } from "./PublicCollectionPage.types";

/** The public collection page's Suspense boundary: `notFound()` on an unknown author or collection, throws on unavailable. */
export function PublicCollectionPage({ authorId, collectionId }: PublicCollectionPageProps) {
  return (
    <Suspense fallback={<PublicCollectionSkeleton />}>
      <PublicCollectionContent authorId={authorId} collectionId={collectionId} />
    </Suspense>
  );
}

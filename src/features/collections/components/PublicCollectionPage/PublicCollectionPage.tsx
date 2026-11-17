import { Suspense } from "react";

import { PublicCollectionContent } from "../PublicCollectionContent/PublicCollectionContent";
import { PublicCollectionSkeleton } from "../PublicCollectionSkeleton/PublicCollectionSkeleton";

import type { PublicCollectionPageProps } from "./PublicCollectionPage.types";

/**
 * The public collection page's Suspense boundary: `notFound()` on an unknown author or collection, throws on
 * unavailable. The route's params arrive as promises and are awaited only inside the boundary: awaiting them above it
 * would make the whole page dynamic, while here the shell and the skeleton prerender and only the collection streams
 * in (Cache Components).
 */
export function PublicCollectionPage({ authorId, collectionId, renderModeration }: PublicCollectionPageProps) {
  return (
    <Suspense fallback={<PublicCollectionSkeleton />}>
      <PublicCollectionContent authorId={authorId} collectionId={collectionId} renderModeration={renderModeration} />
    </Suspense>
  );
}

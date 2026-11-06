import { Suspense } from "react";

import { CONTENT_LANG } from "@/shared/config/constants";

import { CollectionContent } from "../CollectionContent/CollectionContent";
import { CollectionPageSkeleton } from "../CollectionPageSkeleton/CollectionPageSkeleton";

import type { CollectionPageProps } from "./CollectionPage.types";

/** `/account/poems/collections/<id>`: the collection in a Suspense boundary with its skeleton (design D4). */
export function CollectionPage({ collectionId }: CollectionPageProps) {
  return (
    <div lang={CONTENT_LANG}>
      <Suspense fallback={<CollectionPageSkeleton />}>
        <CollectionContent collectionId={collectionId} />
      </Suspense>
    </div>
  );
}

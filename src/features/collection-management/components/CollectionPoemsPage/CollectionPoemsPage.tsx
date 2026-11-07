import { Suspense } from "react";

import { CONTENT_LANG } from "@/shared/config/constants";

import { COLLECTION_POEMS_PAGE_COPY } from "../../model/collection-management-messages";
import { CollectionPoemsContent } from "../CollectionPoemsContent/CollectionPoemsContent";
import { CollectionPoemsSkeleton } from "../CollectionPoemsSkeleton/CollectionPoemsSkeleton";

import type { CollectionPoemsPageProps } from "./CollectionPoemsPage.types";

/** `/account/poems/collections/<id>/poems`: the heading in the static shell, the content in Suspense (add-poems-to-collections D5). */
export function CollectionPoemsPage({ collectionId }: CollectionPoemsPageProps) {
  return (
    <div lang={CONTENT_LANG} className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{COLLECTION_POEMS_PAGE_COPY.heading}</h1>
      <Suspense fallback={<CollectionPoemsSkeleton />}>
        <CollectionPoemsContent collectionId={collectionId} />
      </Suspense>
    </div>
  );
}

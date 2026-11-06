import { Suspense } from "react";

import { CONTENT_LANG } from "@/shared/config/constants";

import { NEW_COLLECTION_COPY } from "../../model/collection-management-messages";
import { CollectionFormSkeleton } from "../CollectionFormSkeleton/CollectionFormSkeleton";
import { NewCollectionContent } from "../NewCollectionContent/NewCollectionContent";

/** `/account/poems/collections/new`: the heading in the static shell, the content in Suspense (design D5). */
export function NewCollectionPage() {
  return (
    <div lang={CONTENT_LANG} className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{NEW_COLLECTION_COPY.heading}</h1>
      <Suspense fallback={<CollectionFormSkeleton />}>
        <NewCollectionContent />
      </Suspense>
    </div>
  );
}

import { Suspense } from "react";

import { CONTENT_LANG } from "@/shared/config/constants";

import { EDIT_COLLECTION_COPY } from "../../model/collection-management-messages";
import { CollectionFormSkeleton } from "../CollectionFormSkeleton/CollectionFormSkeleton";
import { EditCollectionContent } from "../EditCollectionContent/EditCollectionContent";

import type { EditCollectionPageProps } from "./EditCollectionPage.types";

/** `/account/poems/collections/<id>/edit`: the heading in the static shell, the content in Suspense (design D6). */
export function EditCollectionPage({ collectionId }: EditCollectionPageProps) {
  return (
    <div lang={CONTENT_LANG} className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{EDIT_COLLECTION_COPY.heading}</h1>
      <Suspense fallback={<CollectionFormSkeleton />}>
        <EditCollectionContent collectionId={collectionId} />
      </Suspense>
    </div>
  );
}

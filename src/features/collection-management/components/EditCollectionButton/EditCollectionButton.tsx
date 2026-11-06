import { ButtonLink } from "@/shared/ui";

import { COLLECTION_PAGE_COPY } from "../../model/collection-management-messages";
import { editCollectionPath } from "../../model/collection-paths";

import type { EditCollectionButtonProps } from "./EditCollectionButton.types";

/** The `primary` edit link (`COLLECTION_PAGE_COPY.edit`) to the edit page (FR-6). */
export function EditCollectionButton({ collectionId }: EditCollectionButtonProps) {
  return <ButtonLink href={editCollectionPath(collectionId)}>{COLLECTION_PAGE_COPY.edit}</ButtonLink>;
}

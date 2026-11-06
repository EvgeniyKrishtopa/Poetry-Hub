import { ButtonLink } from "@/shared/ui";

import { COLLECTION_LIST_COPY } from "../../model/collection-management-messages";
import { NEW_COLLECTION_PATH } from "../../model/collection-paths";

/** The `ghost` link to the create page in `/account/poems`' button row (design D3). */
export function CreateCollectionLink() {
  // `ghost`, so the add-poem link stays the row's primary action.
  return (
    <ButtonLink variant="ghost" href={NEW_COLLECTION_PATH}>
      {COLLECTION_LIST_COPY.createLink}
    </ButtonLink>
  );
}

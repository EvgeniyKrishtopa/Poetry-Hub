import { AUTHOR_EDITOR_PATH } from "@/features/authors";
import { ButtonLink } from "@/shared/ui";

import { NEW_COLLECTION_COPY } from "../../model/collection-management-messages";

/** The create page's not-public text and the link to the profile editor (FR-3). */
export function CollectionNotPublicNotice() {
  return (
    <div className="flex flex-col items-start gap-4">
      <p className="text-muted">{NEW_COLLECTION_COPY.notPublic}</p>
      {/* Pulled left by the button's own padding, so its text lines up with the paragraph's. */}
      <ButtonLink variant="ghost" href={AUTHOR_EDITOR_PATH} className="-ml-4">
        {NEW_COLLECTION_COPY.profileEditorLink}
      </ButtonLink>
    </div>
  );
}

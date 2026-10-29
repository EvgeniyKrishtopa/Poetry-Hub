import { AUTHOR_EDITOR_PATH } from "@/features/authors";
import { ButtonLink } from "@/shared/ui";

import { POEM_MANAGEMENT_COPY } from "../../model/poem-management-messages";

/** The not-public message and the link to the profile editor, on the list and the add page (FR-2, FR-3). */
export function NotPublicNotice() {
  return (
    <div className="flex flex-col items-start gap-4">
      <p className="text-muted">{POEM_MANAGEMENT_COPY.notPublic}</p>
      {/* Pulled left by the button's own padding, so its text lines up with the paragraph's. */}
      <ButtonLink variant="ghost" href={AUTHOR_EDITOR_PATH} className="-ml-4">
        {POEM_MANAGEMENT_COPY.profileEditorLink}
      </ButtonLink>
    </div>
  );
}

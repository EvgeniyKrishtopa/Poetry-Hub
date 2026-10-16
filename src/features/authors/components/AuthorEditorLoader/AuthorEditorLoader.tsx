import { requireUserId } from "@/features/auth";
import { Alert } from "@/shared/ui";

import { getMyAuthorProfile } from "../../dal/my-author-profile";
import { PROFILE_LOAD_FAILED_MESSAGE } from "../../model/author-messages";
import { AuthorProfileEditor } from "../AuthorProfileEditor/AuthorProfileEditor";

/** Session gate, then the owner read: the editor, or the load-failure alert (FR-2, FR-18). */
export async function AuthorEditorLoader() {
  // Redirects a signed-out visitor to /login before any profile read (NFR-2, design D9).
  await requireUserId();
  const result = await getMyAuthorProfile();

  // mt-6 on top of the panel's 8 px gap: the mockup's 32 px between the heading and the content.
  if (!result.ok) {
    return (
      <Alert tone="danger" className="mt-6">
        {PROFILE_LOAD_FAILED_MESSAGE}
      </Alert>
    );
  }
  return <AuthorProfileEditor profile={result.profile} />;
}

import { requireSession } from "@/features/auth";
import { SESSION_STATE } from "@/shared/config/constants";
import { Alert } from "@/shared/ui";

import { getMyAuthorProfile } from "../../dal/my-author-profile";
import { PROFILE_LOAD_FAILED_MESSAGE } from "../../model/author-messages";
import { AuthorProfileEditor } from "../AuthorProfileEditor/AuthorProfileEditor";
import { SessionUnavailableAlert } from "../SessionUnavailableAlert/SessionUnavailableAlert";

// mt-6 on top of the panel's 8 px gap: the mockup's 32 px between the heading and the content.
const CONTENT_OFFSET_CLASS = "mt-6";

/** Session gate, then the owner read: the editor, the load-failure alert, or the outage alert (FR-2, FR-18, FR-20). */
export async function AuthorEditorLoader() {
  // Redirects a signed-out visitor to /login before any profile read (NFR-2, design D9).
  const session = await requireSession();
  if (session.state === SESSION_STATE.unknown) {
    return (
      <div className={CONTENT_OFFSET_CLASS}>
        <SessionUnavailableAlert />
      </div>
    );
  }

  const result = await getMyAuthorProfile();
  if (!result.ok) {
    return (
      <Alert tone="danger" className={CONTENT_OFFSET_CLASS}>
        {PROFILE_LOAD_FAILED_MESSAGE}
      </Alert>
    );
  }
  return <AuthorProfileEditor profile={result.profile} />;
}

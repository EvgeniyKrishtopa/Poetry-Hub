import { requireSession } from "@/features/auth";
import { SESSION_STATE } from "@/shared/config/constants";

import { getMyAuthorProfile } from "../../dal/my-author-profile";
import { ACCOUNT_AUTHOR_SECTION_TITLE } from "../../model/author-messages";
import { AccountAuthorLinks } from "../AccountAuthorLinks/AccountAuthorLinks";
import { SessionUnavailableAlert } from "../SessionUnavailableAlert/SessionUnavailableAlert";

/**
 * The account page's author-profile section: session gate, then the owner read, inside
 * `AccountPage`'s Suspense boundary (FR-1, FR-18). When the session can't be checked, the heading
 * stays and the outage alert takes the links' place (FR-20).
 */
export async function AccountAuthorSection() {
  // Redirects a signed-out visitor to /login before any profile read (NFR-2). Without it, a guest's
  // read would come back as "no profile" and the page would offer to create an author profile.
  const session = await requireSession();

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold">{ACCOUNT_AUTHOR_SECTION_TITLE}</h2>
      {session.state === SESSION_STATE.unknown ? (
        <SessionUnavailableAlert />
      ) : (
        <AccountAuthorLinks result={await getMyAuthorProfile()} />
      )}
    </section>
  );
}

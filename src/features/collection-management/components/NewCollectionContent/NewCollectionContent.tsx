import { requireSession } from "@/features/auth";
import { getOwnPublicAuthor } from "@/features/authors";
import { SESSION_STATE } from "@/shared/config/constants";
import { SessionUnavailableAlert } from "@/shared/ui";

import { CollectionNotPublicNotice } from "../CollectionNotPublicNotice/CollectionNotPublicNotice";
import { NewCollectionForm } from "../NewCollectionForm/NewCollectionForm";

/** Session and own public profile, then the form or the not-public notice (design D5). */
export async function NewCollectionContent() {
  // Redirects a signed-out reader to /login before any read (FR-16).
  const session = await requireSession();
  if (session.state === SESSION_STATE.unknown) return <SessionUnavailableAlert />;

  const own = await getOwnPublicAuthor();
  // The route's error.tsx shows the generic error screen; the DAL already logged the cause.
  if (!own.ok) throw new Error("New collection page unavailable");
  if (own.status === "not-public") return <CollectionNotPublicNotice />;
  return <NewCollectionForm />;
}

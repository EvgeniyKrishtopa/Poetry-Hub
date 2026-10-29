import { requireSession } from "@/features/auth";
import { getOwnPublicAuthor } from "@/features/authors";
import { listPoemGenres } from "@/features/poems";
import { SESSION_STATE } from "@/shared/config/constants";
import { Alert, SessionUnavailableAlert } from "@/shared/ui";

import { POEM_MANAGEMENT_COPY } from "../../model/poem-management-messages";
import { NewPoemForm } from "../NewPoemForm/NewPoemForm";
import { NotPublicNotice } from "../NotPublicNotice/NotPublicNotice";

/** Session, own public author, then genres and the form, or a notice (design D4 table). */
export async function NewPoemContent() {
  // Redirects a signed-out reader to /login before any read (FR-3).
  const session = await requireSession();
  if (session.state === SESSION_STATE.unknown) return <SessionUnavailableAlert />;

  const own = await getOwnPublicAuthor();
  if (!own.ok) return <Alert tone="danger">{POEM_MANAGEMENT_COPY.ownPoemsUnavailable}</Alert>;
  if (own.status === "not-public") return <NotPublicNotice />;

  const genres = await listPoemGenres();
  if (!genres.ok) return <Alert tone="danger">{POEM_MANAGEMENT_COPY.genresUnavailable}</Alert>;
  return <NewPoemForm genres={genres.genres} />;
}

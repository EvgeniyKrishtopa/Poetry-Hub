import { notFound } from "next/navigation";

import { requireSession } from "@/features/auth";
import { listPoemGenres } from "@/features/poems";
import { SESSION_STATE } from "@/shared/config/constants";
import { Alert, SessionUnavailableAlert } from "@/shared/ui";

import { getOwnPoem } from "../../dal/own-poem";
import { storedFormValues } from "../../model/poem-form-values";
import { POEM_MANAGEMENT_COPY } from "../../model/poem-management-messages";
import { EditPoemForm } from "../EditPoemForm/EditPoemForm";

import type { EditPoemContentProps } from "./EditPoemContent.types";
import { storedValuesKey } from "./stored-values-key";

/** Session, the own poem, genres, then the keyed form; `notFound()` or a throw (edit-poem design D6). */
export async function EditPoemContent({ poemId }: EditPoemContentProps) {
  // Redirects a signed-out reader to /login before any read (FR-2).
  const session = await requireSession();
  if (session.state === SESSION_STATE.unknown) return <SessionUnavailableAlert />;

  const id = await poemId;
  const poem = await getOwnPoem(id);
  if (!poem.ok) {
    // Another author's poem, a malformed id, or a non-public own profile: the owner's poem page's rules.
    if (poem.reason === "not-found") notFound();
    // The route's error.tsx shows the generic error screen; the DAL already logged the cause.
    throw new Error("Edit poem page unavailable");
  }

  const genres = await listPoemGenres();
  if (!genres.ok) return <Alert tone="danger">{POEM_MANAGEMENT_COPY.genresUnavailable}</Alert>;

  const stored = storedFormValues(poem.poem, genres.genres);
  return <EditPoemForm key={storedValuesKey(stored)} poemId={id} stored={stored} genres={genres.genres} />;
}

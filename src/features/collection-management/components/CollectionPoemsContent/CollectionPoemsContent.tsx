import { notFound } from "next/navigation";

import { requireSession } from "@/features/auth";
import { SESSION_STATE } from "@/shared/config/constants";
import { SessionUnavailableAlert } from "@/shared/ui";

import { getCollectionPoemChoices } from "../../dal/collection-poems";
import { getOwnCollection } from "../../dal/own-collections";
import { COLLECTION_POEMS_PAGE_COPY } from "../../model/collection-management-messages";
import { CollectionPoemsForm } from "../CollectionPoemsForm/CollectionPoemsForm";

import type { CollectionPoemsContentProps } from "./CollectionPoemsContent.types";

/** Session, `getOwnCollection`, the choices, then the hint and the form; `notFound()`; or a throw (add-poems-to-collections D5). */
export async function CollectionPoemsContent({ collectionId }: CollectionPoemsContentProps) {
  // Redirects a signed-out reader to /login before any read (FR-13).
  const session = await requireSession();
  if (session.state === SESSION_STATE.unknown) return <SessionUnavailableAlert />;

  const id = await collectionId;
  const collection = await getOwnCollection(id);
  if (!collection.ok) {
    // Another author's collection, a malformed id, or a non-public own profile: the collection page's rules (FR-4).
    if (collection.reason === "not-found") notFound();
    // The route's error.tsx shows the generic error screen; the DAL already logged the cause.
    throw new Error("Collection poems page unavailable");
  }

  const choices = await getCollectionPoemChoices(id);
  if (!choices.ok) throw new Error("Collection poems page unavailable");

  return (
    <>
      <p className="text-muted">{COLLECTION_POEMS_PAGE_COPY.hint(collection.collection.title)}</p>
      <CollectionPoemsForm collectionId={id} choices={choices.choices} />
    </>
  );
}

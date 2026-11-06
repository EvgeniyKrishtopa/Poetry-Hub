import { notFound } from "next/navigation";

import { requireSession } from "@/features/auth";
import { SESSION_STATE } from "@/shared/config/constants";
import { SessionUnavailableAlert } from "@/shared/ui";

import { getOwnCollection } from "../../dal/own-collections";
import type { CollectionFormValues } from "../../model/collection-form-values";
import { EditCollectionForm } from "../EditCollectionForm/EditCollectionForm";

import type { EditCollectionContentProps } from "./EditCollectionContent.types";
import { storedValuesKey } from "./stored-values-key";

/** Session, `getOwnCollection`, then the form keyed by the stored values' digest (design D6). */
export async function EditCollectionContent({ collectionId }: EditCollectionContentProps) {
  // Redirects a signed-out reader to /login before any read (FR-16).
  const session = await requireSession();
  if (session.state === SESSION_STATE.unknown) return <SessionUnavailableAlert />;

  const id = await collectionId;
  const result = await getOwnCollection(id);
  if (!result.ok) {
    // Another author's collection, a malformed id, or a non-public own profile: the collection page's rules (FR-7).
    if (result.reason === "not-found") notFound();
    // The route's error.tsx shows the generic error screen; the DAL already logged the cause.
    throw new Error("Edit collection page unavailable");
  }

  const { title, description } = result.collection;
  // No description shows as an empty text area (FR-7).
  const stored: CollectionFormValues = { title, description: description ?? "" };
  return <EditCollectionForm key={storedValuesKey(stored)} collectionId={id} stored={stored} />;
}

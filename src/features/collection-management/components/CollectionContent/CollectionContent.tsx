import { notFound } from "next/navigation";

import { requireSession } from "@/features/auth";
import { SESSION_STATE } from "@/shared/config/constants";
import { splitParagraphs } from "@/shared/lib/split-paragraphs";
import { SessionUnavailableAlert } from "@/shared/ui";

import { getOwnCollection } from "../../dal/own-collections";
import { CollectionActions } from "../CollectionActions/CollectionActions";
import { DeleteCollectionButton } from "../DeleteCollectionButton/DeleteCollectionButton";
import { EditCollectionButton } from "../EditCollectionButton/EditCollectionButton";
import { SavedCollectionNotice } from "../SavedCollectionNotice/SavedCollectionNotice";

import type { CollectionContentProps } from "./CollectionContent.types";

/** Session, `getOwnCollection`, then the notice, title, description, and actions; `notFound()`; or a throw (design D4). */
export async function CollectionContent({ collectionId }: CollectionContentProps) {
  // Redirects a signed-out reader to /login before any read (FR-16).
  const session = await requireSession();
  if (session.state === SESSION_STATE.unknown) return <SessionUnavailableAlert />;

  const id = await collectionId;
  const result = await getOwnCollection(id);
  if (!result.ok) {
    // Another author's collection, a malformed id, or a non-public own profile: a soft 404 inside the boundary.
    if (result.reason === "not-found") notFound();
    // The route's error.tsx shows the generic error screen; the DAL already logged the cause.
    throw new Error("Collection page unavailable");
  }

  const { title, description } = result.collection;
  return (
    <div className="flex flex-col gap-8">
      {/* Above the heading (artboard 32). */}
      <SavedCollectionNotice collectionId={id} />
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      {description !== null && (
        <div className="flex flex-col gap-3">
          {splitParagraphs(description).map((paragraph, index) => (
            // A single line break stays inside its paragraph, as on the home greeting (FR-6).
            <p key={index} className="whitespace-pre-line text-base leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      )}
      <CollectionActions>
        <EditCollectionButton collectionId={id} />
        <DeleteCollectionButton collectionId={id} title={title} />
      </CollectionActions>
    </div>
  );
}

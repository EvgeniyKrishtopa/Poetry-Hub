import { notFound } from "next/navigation";

import { requireSession } from "@/features/auth";
import { SESSION_STATE } from "@/shared/config/constants";
import { splitParagraphs } from "@/shared/lib/split-paragraphs";
import { SessionUnavailableAlert } from "@/shared/ui";

import { getCollectionPoemChoices, listCollectedPoems } from "../../dal/collection-poems";
import { getOwnCollection } from "../../dal/own-collections";
import { CollectionActions } from "../CollectionActions/CollectionActions";
import { CollectionPoemList } from "../CollectionPoemList/CollectionPoemList";
import { DeleteCollectionButton } from "../DeleteCollectionButton/DeleteCollectionButton";
import { EditCollectionButton } from "../EditCollectionButton/EditCollectionButton";
import { SavedCollectionNotice } from "../SavedCollectionNotice/SavedCollectionNotice";

import type { CollectionContentProps } from "./CollectionContent.types";

/**
 * Session, `getOwnCollection`, its poem choices, then the notice, title, description, poems, and actions;
 * `notFound()`; or a throw (design D4).
 */
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

  // The choices say whether there is anything to manage; the author's order of this collection's poems comes
  // from the collected poems, because the checklist stays newest first (work-ordering design D2, D7).
  const [choices, collected] = await Promise.all([getCollectionPoemChoices(id), listCollectedPoems()]);
  // Same error screen as a failed collection read; the DAL already logged the cause.
  if (!choices.ok || !collected.ok) throw new Error("Collection poems unavailable");
  // Derived per render, never stored: the collection's own poems in the author's order, and whether there is
  // anything to manage.
  const poems = collected.poems.filter((poem) => poem.collectionId === id);
  const canManage = choices.choices.length > 0;

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
      <CollectionPoemList poems={poems} />
      <CollectionActions
        editButton={<EditCollectionButton collectionId={id} />}
        manageCollectionId={canManage ? id : undefined}
        deleteButton={<DeleteCollectionButton collectionId={id} title={title} />}
      />
    </div>
  );
}

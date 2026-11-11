import { notFound } from "next/navigation";

import { getPublicAuthorName } from "@/features/authors";
import { authorPoemPath, PoemTitleList } from "@/features/poems";
import { CONTENT_LANG } from "@/shared/config/constants";
import { splitParagraphs } from "@/shared/lib/split-paragraphs";

import { getPublicCollection } from "../../dal/public-collections";
import { PUBLIC_COLLECTIONS_COPY } from "../../model/public-collections-messages";

import type { PublicCollectionContentProps } from "./PublicCollectionContent.types";

/**
 * Checks the author, then reads the collection and renders its heading, description, and poems; `notFound()` on an
 * unknown author or collection, throws to the error screen on unavailable (public-collections D7). It reads no
 * session, so every visitor sees the same page and no management control.
 */
export async function PublicCollectionContent({ authorId, collectionId }: PublicCollectionContentProps) {
  const id = await authorId;
  const author = await getPublicAuthorName(id);

  if (!author.ok) {
    // Inside a streamed boundary this is a soft 404: the not-found UI with status 200.
    if (author.reason === "not-found") notFound();
    // The route's error.tsx shows the generic error screen; the authors DAL already logged the cause.
    throw new Error("Collection page unavailable");
  }

  const result = await getPublicCollection(id, await collectionId);
  if (!result.ok) {
    if (result.reason === "not-found") notFound();
    // The collections DAL already logged the cause.
    throw new Error("Collection page unavailable");
  }

  const { title, description, poems } = result.collection;
  return (
    <article lang={CONTENT_LANG} className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
      {description !== null && (
        <div className="flex flex-col gap-3">
          {splitParagraphs(description).map((paragraph, index) => (
            // A single line break stays inside its paragraph, as on the owner's collection page.
            <p key={index} className="whitespace-pre-line text-base leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      )}
      {/* A collection read here always has poems (D5), so the heading never sits over an empty list. */}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-[-0.01em]">{PUBLIC_COLLECTIONS_COPY.poemsHeading}</h2>
        <PoemTitleList poems={poems} poemHref={(poemId) => authorPoemPath(id, poemId)} />
      </section>
    </article>
  );
}

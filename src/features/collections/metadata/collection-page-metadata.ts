import "server-only";

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getPublicAuthorName } from "@/features/authors";
import {
  DESCRIPTION_MAX_LENGTH,
  FALLBACK_METADATA,
  buildPageMetadata,
  toPlainTextExcerpt,
} from "@/shared/lib/seo";

import { getPublicCollection } from "../dal/public-collections";
import { getCollectionFallbackDescription, getCollectionPageTitle } from "../model/public-collections-messages";
import { publicCollectionPath } from "../model/public-collection-paths";
import type { PublicCollection } from "../model/public-collections.types";

function buildDescription(collection: PublicCollection, authorName: string): string {
  const own = collection.description === null ? "" : toPlainTextExcerpt(collection.description, DESCRIPTION_MAX_LENGTH);
  if (own !== "") return own;

  const sentence = getCollectionFallbackDescription(collection.title, authorName);
  return toPlainTextExcerpt(sentence, DESCRIPTION_MAX_LENGTH);
}

function buildCollectionMetadata(authorId: string, authorName: string, collection: PublicCollection): Metadata {
  return buildPageMetadata({
    title: getCollectionPageTitle(collection.title, authorName),
    description: buildDescription(collection, authorName),
    // The builder lowercases the path, so an uppercase author id in the request still gets the one canonical address.
    path: publicCollectionPath(authorId, collection.id),
    type: "website",
  });
}

/**
 * A public collection page's metadata, from the page's own memoized reads (NFR-1): a `not-found` result (an unknown
 * author, or a collection that is missing, empty or another author's) is `notFound()`, which marks the page
 * `noindex`; `unavailable` returns the site's fallback, since a throw here would show the not-found screen instead
 * of the error screen; an exception in this module's own code returns the fallback too (FR-1 to FR-5, FR-10).
 */
export async function getPublicCollectionPageMetadata(authorId: string, collectionId: string): Promise<Metadata> {
  const author = await getPublicAuthorName(authorId);
  // Outside any `try`: `notFound()` works by throwing.
  if (!author.ok && author.reason === "not-found") notFound();
  if (!author.ok) return FALLBACK_METADATA;

  const result = await getPublicCollection(authorId, collectionId);
  if (!result.ok && result.reason === "not-found") notFound();
  if (!result.ok) return FALLBACK_METADATA;

  try {
    return buildCollectionMetadata(authorId, author.name, result.collection);
  } catch (error) {
    // The kind only, never the message: it could carry the collection's text.
    const kind = error instanceof Error ? error.name : "unknown";
    console.error(`[collections] build collection page metadata failed: ${kind}`);
    return FALLBACK_METADATA;
  }
}

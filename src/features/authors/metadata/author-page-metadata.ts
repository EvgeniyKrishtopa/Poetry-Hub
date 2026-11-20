import "server-only";

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  DESCRIPTION_MAX_LENGTH,
  FALLBACK_METADATA,
  buildPageMetadata,
  toPlainTextExcerpt,
} from "@/shared/lib/seo";

import { getPublicAuthor } from "../dal/public-authors";
import type { PublicAuthor } from "../model/author.types";
import { authorPagePath } from "../model/author-page-path";
import { getAuthorFallbackDescription } from "../model/author-messages";
import { fullName } from "../model/full-name";

function buildDescription(author: PublicAuthor, name: string): string {
  const about = author.about === null ? "" : toPlainTextExcerpt(author.about, DESCRIPTION_MAX_LENGTH);
  if (about !== "") return about;

  return getAuthorFallbackDescription(name);
}

function buildAuthorMetadata(author: PublicAuthor): Metadata {
  const name = fullName(author);
  return buildPageMetadata({
    title: name,
    description: buildDescription(author, name),
    path: authorPagePath(author.id),
    type: "profile",
    image: author.photoUrl,
  });
}

/**
 * A public author page's metadata, from the page's own memoized read (NFR-1): a `not-found` result is
 * `notFound()`, which marks the page `noindex`; `unavailable` returns the site's fallback, since a throw here
 * would show the not-found screen instead of the error screen; an exception in this module's own code returns
 * the fallback too (FR-1 to FR-5, FR-10).
 */
export async function getAuthorPageMetadata(id: string): Promise<Metadata> {
  const result = await getPublicAuthor(id);
  // Outside any `try`: `notFound()` works by throwing.
  if (!result.ok && result.reason === "not-found") notFound();
  if (!result.ok) return FALLBACK_METADATA;

  try {
    return buildAuthorMetadata(result.author);
  } catch (error) {
    // The kind only, never the message: it could carry the author's text.
    const kind = error instanceof Error ? error.name : "unknown";
    console.error(`[authors] build author page metadata failed: ${kind}`);
    return FALLBACK_METADATA;
  }
}

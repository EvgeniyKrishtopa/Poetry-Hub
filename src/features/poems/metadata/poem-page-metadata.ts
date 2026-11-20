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

import { getAuthorPoem } from "../dal/author-poems";
import { getPoemFallbackDescription, getPoemPageTitle } from "../model/poems-messages";
import { authorPoemPath } from "../model/poem-paths";
import type { Poem } from "../model/poem.types";

function buildDescription(poem: Poem, authorName: string): string {
  const excerpt = toPlainTextExcerpt(poem.text, DESCRIPTION_MAX_LENGTH);
  if (excerpt !== "") return excerpt;

  const sentence = getPoemFallbackDescription(poem.title, authorName);
  return toPlainTextExcerpt(sentence, DESCRIPTION_MAX_LENGTH);
}

function buildPoemMetadata(authorId: string, authorName: string, poem: Poem): Metadata {
  return buildPageMetadata({
    title: getPoemPageTitle(poem.title, authorName),
    description: buildDescription(poem, authorName),
    // The builder lowercases the path, so an uppercase author id in the request still gets the one canonical address.
    path: authorPoemPath(authorId, poem.id),
    type: "article",
    image: poem.illustrationUrl,
  });
}

/**
 * The poem page's metadata, from the page's own memoized reads (NFR-1): a `not-found` result is `notFound()`,
 * which marks the page `noindex`; `unavailable` returns the site's fallback, since a throw here would show the
 * not-found screen instead of the error screen; an exception in this module's own code returns the fallback too
 * (FR-1 to FR-5, FR-10).
 */
export async function getPoemPageMetadata(authorId: string, poemId: string): Promise<Metadata> {
  const author = await getPublicAuthorName(authorId);
  // Outside any `try`: `notFound()` works by throwing.
  if (!author.ok && author.reason === "not-found") notFound();
  if (!author.ok) return FALLBACK_METADATA;

  const result = await getAuthorPoem(authorId, poemId);
  if (!result.ok && result.reason === "not-found") notFound();
  if (!result.ok) return FALLBACK_METADATA;

  try {
    return buildPoemMetadata(authorId, author.name, result.poem);
  } catch (error) {
    // The kind only, never the message: it could carry the poem's text.
    const kind = error instanceof Error ? error.name : "unknown";
    console.error(`[poems] build poem page metadata failed: ${kind}`);
    return FALLBACK_METADATA;
  }
}

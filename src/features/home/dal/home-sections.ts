import "server-only";

import { authorPagePath, fullName, listPublicAuthors, type PublicAuthor } from "@/features/authors";
import { authorPoemPath, listLatestPoems, listPoemsByIds, type PoemSummary } from "@/features/poems";

import { LATEST_LIMIT } from "../model/home.constants";
import type { FeaturedAuthor, FeaturedWork, LatestWork, SectionResult } from "../model/home-section.types";
import { orderByIds } from "../model/order-by-ids";
import { toAuthorDescription } from "../model/to-author-description";

import { getHomeFeaturedIds } from "./home-featured";

// The three sections share one source of author names, the public author list: when it fails, all three
// results are `{ ok: false }` together (FR-7). A failure in only one poem read leaves the other sections alone.
// A poem whose author is missing from that list is dropped: the poem reads are cached on their own and can keep
// a poem of an author who has just stopped being public, and a card without its author's name is not shown.

const FAILED = { ok: false } as const;

/** Author id → display name, for the poem cards. */
function authorNamesById(authors: readonly PublicAuthor[]): ReadonlyMap<string, string> {
  return new Map(authors.map((author) => [author.id, fullName(author)]));
}

/** The poems whose author is in `names`, each mapped with that author's name; the others are dropped. */
function withAuthorNames<Item>(
  poems: readonly PoemSummary[],
  names: ReadonlyMap<string, string>,
  toItem: (poem: PoemSummary, authorName: string) => Item,
): readonly Item[] {
  return poems.flatMap((poem) => {
    const authorName = names.get(poem.authorId);
    return authorName === undefined ? [] : [toItem(poem, authorName)];
  });
}

function toFeaturedWork(poem: PoemSummary, authorName: string): FeaturedWork {
  return {
    id: poem.id,
    title: poem.title,
    authorName,
    href: authorPoemPath(poem.authorId, poem.id),
    coverUrl: poem.illustrationUrl,
  };
}

function toLatestWork(poem: PoemSummary, authorName: string): LatestWork {
  return { id: poem.id, title: poem.title, authorName, href: authorPoemPath(poem.authorId, poem.id) };
}

function toFeaturedAuthor(author: PublicAuthor): FeaturedAuthor {
  return {
    id: author.id,
    name: fullName(author),
    href: authorPagePath(author.id),
    photoUrl: author.photoUrl,
    description: toAuthorDescription(author.about),
  };
}

/** The featured-poem cards: the chosen ids, their poems and the author names, in the admin's order (FR-2). */
export async function getFeaturedWorks(): Promise<SectionResult<FeaturedWork>> {
  const [idsResult, authorsResult] = await Promise.all([getHomeFeaturedIds(), listPublicAuthors()]);
  if (!idsResult.ok || !authorsResult.ok) return FAILED;

  const poemsResult = await listPoemsByIds(idsResult.ids.poemIds);
  if (!poemsResult.ok) return FAILED;

  const names = authorNamesById(authorsResult.authors);
  return { ok: true, items: withAuthorNames(poemsResult.poems, names, toFeaturedWork) };
}

/** The project-author cards: the chosen ids resolved against the public author list, in the admin's order (FR-4). */
export async function getFeaturedAuthors(): Promise<SectionResult<FeaturedAuthor>> {
  const [idsResult, authorsResult] = await Promise.all([getHomeFeaturedIds(), listPublicAuthors()]);
  if (!idsResult.ok || !authorsResult.ok) return FAILED;

  const chosenAuthors = orderByIds(idsResult.ids.authorIds, authorsResult.authors, (author) => author.id);
  return { ok: true, items: chosenAuthors.map(toFeaturedAuthor) };
}

/** The newest poems with their author names, newest first (FR-5). */
export async function getLatestWorks(): Promise<SectionResult<LatestWork>> {
  const [latestResult, authorsResult] = await Promise.all([listLatestPoems(LATEST_LIMIT), listPublicAuthors()]);
  if (!latestResult.ok || !authorsResult.ok) return FAILED;

  const names = authorNamesById(authorsResult.authors);
  return { ok: true, items: withAuthorNames(latestResult.poems, names, toLatestWork) };
}

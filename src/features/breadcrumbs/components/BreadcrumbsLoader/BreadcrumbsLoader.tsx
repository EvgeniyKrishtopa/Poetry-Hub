import { getPublicAuthorName, type PublicAuthorNameResult } from "@/features/authors";
import { getOwnCollectionTitle, type OwnCollectionTitleResult } from "@/features/collection-management";
import { getOwnPoemTitle, type OwnPoemTitleResult } from "@/features/poem-management";
import { getAuthorPoem, type AuthorPoemResult } from "@/features/poems";

import type { RouteMatch } from "../../model/breadcrumb.types";
import { buildTrail } from "../../model/build-trail";
import { matchRoute } from "../../model/match-route";
import { BreadcrumbsView } from "../BreadcrumbsView/BreadcrumbsView";

import type { BreadcrumbsLoaderProps } from "./BreadcrumbsLoader.types";

interface TrailReads {
  readonly authorName?: PublicAuthorNameResult;
  readonly poem?: AuthorPoemResult;
  readonly ownPoemTitle?: OwnPoemTitleResult;
  readonly ownCollectionTitle?: OwnCollectionTitleResult;
}

/**
 * The reads a match needs: the author name on the author page, and on a poem page the poem too, in
 * parallel; the owner's poem or collection title on the owner's pages. Every read is memoized per request,
 * so the page shares them (FR-12, design D10). The title reads never redirect: the proxy already turned
 * away a signed-out request.
 */
async function readForMatch(match: RouteMatch): Promise<TrailReads> {
  switch (match.kind) {
    case "author":
      return { authorName: await getPublicAuthorName(match.id) };
    case "author-poem": {
      const [authorName, poem] = await Promise.all([
        getPublicAuthorName(match.authorId),
        getAuthorPoem(match.authorId, match.poemId),
      ]);
      return { authorName, poem };
    }
    case "own-poem":
    case "own-poem-edit":
      return { ownPoemTitle: await getOwnPoemTitle(match.poemId) };
    case "own-collection":
    case "own-collection-edit":
      return { ownCollectionTitle: await getOwnCollectionTitle(match.collectionId) };
    default:
      return {};
  }
}

/** Awaits the segments, reads what the matched page needs, renders the view or nothing. */
export async function BreadcrumbsLoader({ segments }: BreadcrumbsLoaderProps) {
  const match = matchRoute(await segments);
  const { authorName, poem, ownPoemTitle, ownCollectionTitle } = await readForMatch(match);
  const trail = buildTrail(match, authorName, poem, ownPoemTitle, ownCollectionTitle);

  if (trail.kind === "none") return null;
  return <BreadcrumbsView items={trail.items} />;
}

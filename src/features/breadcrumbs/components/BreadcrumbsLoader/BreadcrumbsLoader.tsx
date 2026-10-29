import { getPublicAuthorName, type PublicAuthorNameResult } from "@/features/authors";
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
}

/**
 * The reads a match needs: the author name on the author page, and on a poem page the poem too, in
 * parallel; the owner's poem title on the owner's poem page. Every read is memoized per request, so the
 * page shares them (FR-12, design D10). The title read never redirects: the proxy already turned away a
 * signed-out request.
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
      return { ownPoemTitle: await getOwnPoemTitle(match.poemId) };
    default:
      return {};
  }
}

/** Awaits the segments, reads what the matched page needs, renders the view or nothing. */
export async function BreadcrumbsLoader({ segments }: BreadcrumbsLoaderProps) {
  const match = matchRoute(await segments);
  const { authorName, poem, ownPoemTitle } = await readForMatch(match);
  const trail = buildTrail(match, authorName, poem, ownPoemTitle);

  if (trail.kind === "none") return null;
  return <BreadcrumbsView items={trail.items} />;
}

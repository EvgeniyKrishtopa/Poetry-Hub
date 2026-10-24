import { getPublicAuthorName, type PublicAuthorNameResult } from "@/features/authors";
import { getAuthorPoem, type AuthorPoemResult } from "@/features/poems";

import type { RouteMatch } from "../../model/breadcrumb.types";
import { buildTrail } from "../../model/build-trail";
import { matchRoute } from "../../model/match-route";
import { BreadcrumbsView } from "../BreadcrumbsView/BreadcrumbsView";

import type { BreadcrumbsLoaderProps } from "./BreadcrumbsLoader.types";

interface TrailReads {
  readonly authorName?: PublicAuthorNameResult;
  readonly poem?: AuthorPoemResult;
}

/**
 * The reads a match needs: the author name on the three author pages, and on a poem page the poem too,
 * in parallel. Both reads are memoized per request, so the page shares them (FR-12).
 */
async function readForMatch(match: RouteMatch): Promise<TrailReads> {
  switch (match.kind) {
    case "author":
      return { authorName: await getPublicAuthorName(match.id) };
    case "author-poems":
      return { authorName: await getPublicAuthorName(match.authorId) };
    case "author-poem": {
      const [authorName, poem] = await Promise.all([
        getPublicAuthorName(match.authorId),
        getAuthorPoem(match.authorId, match.poemId),
      ]);
      return { authorName, poem };
    }
    default:
      return {};
  }
}

/** Awaits the segments, reads what the matched page needs, renders the view or nothing. */
export async function BreadcrumbsLoader({ segments }: BreadcrumbsLoaderProps) {
  const match = matchRoute(await segments);
  const { authorName, poem } = await readForMatch(match);
  const trail = buildTrail(match, authorName, poem);

  if (trail.kind === "none") return null;
  return <BreadcrumbsView items={trail.items} />;
}

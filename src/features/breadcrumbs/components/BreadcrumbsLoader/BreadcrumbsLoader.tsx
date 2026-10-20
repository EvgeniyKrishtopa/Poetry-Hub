import { getPublicAuthorName } from "@/features/authors";

import { buildTrail } from "../../model/build-trail";
import { matchRoute } from "../../model/match-route";
import { BreadcrumbsView } from "../BreadcrumbsView/BreadcrumbsView";

import type { BreadcrumbsLoaderProps } from "./BreadcrumbsLoader.types";

/** Awaits the segments, reads the author name only for an author page, renders the view or nothing. */
export async function BreadcrumbsLoader({ segments }: BreadcrumbsLoaderProps) {
  const match = matchRoute(await segments);
  const authorName = match.kind === "author" ? await getPublicAuthorName(match.id) : undefined;
  const trail = buildTrail(match, authorName);

  if (trail.kind === "none") return null;
  return <BreadcrumbsView items={trail.items} />;
}

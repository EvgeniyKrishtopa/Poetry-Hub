import type { PublicAuthorNameResult } from "@/features/authors";

import type { RouteMatch, Trail } from "./breadcrumb.types";

/** Prepends «Главная» and resolves an author match from its name result: not-found hides the trail. */
export function buildTrail(match: RouteMatch, authorName?: PublicAuthorNameResult): Trail {
  void match;
  void authorName;
  throw new Error("not implemented");
}

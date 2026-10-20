import { AUTHORS_PAGE_TITLES, AUTHORS_PATH, type PublicAuthorNameResult } from "@/features/authors";
import { HOME_PATH } from "@/shared/config/constants";

import type { BreadcrumbItem, RouteMatch, Trail } from "./breadcrumb.types";
import { BREADCRUMB_LABELS } from "./breadcrumbs-messages";

const HOME_ITEM: BreadcrumbItem = { kind: "link", label: BREADCRUMB_LABELS.home, href: HOME_PATH };

const AUTHORS_ITEM: BreadcrumbItem = { kind: "link", label: AUTHORS_PAGE_TITLES.authors, href: AUTHORS_PATH };

const NO_TRAIL: Trail = { kind: "none" };

/** The author page's last item: the name, or «Автор» when the read failed for any reason but not-found. */
function authorLabel(authorName: PublicAuthorNameResult | undefined): string {
  if (authorName?.ok === true) return authorName.name;
  return BREADCRUMB_LABELS.authorFallback;
}

/** Prepends «Главная» and resolves an author match from its name result: not-found hides the trail. */
export function buildTrail(match: RouteMatch, authorName?: PublicAuthorNameResult): Trail {
  if (match.kind === "none") return NO_TRAIL;
  if (match.kind === "static") return { kind: "shown", items: [HOME_ITEM, ...match.items] };

  if (authorName?.ok === false && authorName.reason === "not-found") return NO_TRAIL;
  return {
    kind: "shown",
    items: [HOME_ITEM, AUTHORS_ITEM, { kind: "current", label: authorLabel(authorName) }],
  };
}

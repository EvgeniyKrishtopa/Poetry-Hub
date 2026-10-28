import { AUTHORS_PAGE_TITLES, AUTHORS_PATH, authorPagePath, type PublicAuthorNameResult } from "@/features/authors";
import type { AuthorPoemResult } from "@/features/poems";
import { HOME_PATH } from "@/shared/config/constants";

import type { BreadcrumbItem, RouteMatch, Trail } from "./breadcrumb.types";
import { BREADCRUMB_LABELS } from "./breadcrumbs-messages";

const HOME_ITEM: BreadcrumbItem = { kind: "link", label: BREADCRUMB_LABELS.home, href: HOME_PATH };

const AUTHORS_ITEM: BreadcrumbItem = { kind: "link", label: AUTHORS_PAGE_TITLES.authors, href: AUTHORS_PATH };

const NO_TRAIL: Trail = { kind: "none" };

/** The author's item: the name, or the author fallback label when the read failed for any reason but not-found. */
function authorLabel(authorName: PublicAuthorNameResult | undefined): string {
  if (authorName?.ok === true) return authorName.name;
  return BREADCRUMB_LABELS.authorFallback;
}

function shown(items: readonly BreadcrumbItem[]): Trail {
  return { kind: "shown", items: [HOME_ITEM, AUTHORS_ITEM, ...items] };
}

/**
 * Prepends the home item and resolves an author or poem match from its read results, so the trail
 * agrees with the page (FR-12): an unknown author or poem hides the trail, as the page shows the 404
 * page; an unavailable author shows the author fallback label, as the page shows the error screen.
 * That error screen wins over an unknown poem, so the trail then ends on the fallback label; an
 * unavailable poem read also shows the error screen, so its trail ends on the author's item.
 */
export function buildTrail(match: RouteMatch, authorName?: PublicAuthorNameResult, poem?: AuthorPoemResult): Trail {
  if (match.kind === "none") return NO_TRAIL;
  if (match.kind === "static") return { kind: "shown", items: [HOME_ITEM, ...match.items] };

  if (authorName?.ok === false && authorName.reason === "not-found") return NO_TRAIL;
  // A switch over the reasons, not a check of `ok` alone: a new failure reason falls through to the poem
  // title below and fails to compile until it gets its own rule here.
  const label = authorLabel(authorName);
  if (poem?.ok === false) {
    switch (poem.reason) {
      case "not-found":
        if (authorName?.ok === false) return shown([{ kind: "current", label: BREADCRUMB_LABELS.authorFallback }]);
        return NO_TRAIL;
      // The page shows the error screen: the trail ends at the author (add-poem-creation, breadcrumbs FR-4).
      case "unavailable":
        return shown([{ kind: "current", label }]);
    }
  }

  switch (match.kind) {
    case "author":
      return shown([{ kind: "current", label }]);
    case "author-poem":
      // Unreachable from the loader, which always reads the poem here; without it there's no last item.
      if (poem === undefined) return NO_TRAIL;
      return shown([
        { kind: "link", label, href: authorPagePath(match.authorId) },
        { kind: "current", label: poem.poem.title },
      ]);
  }
}

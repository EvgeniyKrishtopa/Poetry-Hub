import { AUTHOR_EDITOR_PATH, AUTHORS_PAGE_TITLES, AUTHORS_PATH } from "@/features/authors";
import { ACCOUNT_PATH, SIGN_IN_PATH, SIGN_UP_PATH } from "@/shared/config/account-paths";

import type { BreadcrumbItem, RouteMatch } from "./breadcrumb.types";
import { BREADCRUMB_LABELS } from "./breadcrumbs-messages";

interface RouteRow {
  readonly path: string;
  readonly label: string;
}

/**
 * Every page with a fixed trail, written against the named path constants so a renamed path moves the
 * trail with it. Home has no row: `buildTrail` adds «Главная». A row is a parent of every path under it.
 */
export const STATIC_ROUTES: readonly RouteRow[] = [
  { path: AUTHORS_PATH, label: AUTHORS_PAGE_TITLES.authors },
  { path: ACCOUNT_PATH, label: AUTHORS_PAGE_TITLES.account },
  { path: AUTHOR_EDITOR_PATH, label: AUTHORS_PAGE_TITLES.authorEditor },
  { path: SIGN_IN_PATH, label: BREADCRUMB_LABELS.signIn },
  { path: SIGN_UP_PATH, label: BREADCRUMB_LABELS.signUp },
];

const AUTHOR_PAGE_PREFIX = `${AUTHORS_PATH}/`;

function isParentPath(parent: string, path: string): boolean {
  return path.startsWith(`${parent}/`);
}

/** The one dynamic row: exactly one segment after the author directory. */
function matchAuthorId(path: string): string | null {
  if (!path.startsWith(AUTHOR_PAGE_PREFIX)) return null;
  const id = path.slice(AUTHOR_PAGE_PREFIX.length);
  if (id === "" || id.includes("/")) return null;
  return id;
}

/** Maps a URL's segments to its trail by the route table; anything not in the table is `none`. */
export function matchRoute(segments: readonly string[]): RouteMatch {
  const path = `/${segments.join("/")}`;

  const row = STATIC_ROUTES.find((route) => route.path === path);
  if (row !== undefined) {
    const parents: BreadcrumbItem[] = STATIC_ROUTES.filter((route) => isParentPath(route.path, path)).map(
      (route) => ({ kind: "link", label: route.label, href: route.path }),
    );
    return { kind: "static", items: [...parents, { kind: "current", label: row.label }] };
  }

  const authorId = matchAuthorId(path);
  if (authorId !== null) return { kind: "author", id: authorId };

  return { kind: "none" };
}

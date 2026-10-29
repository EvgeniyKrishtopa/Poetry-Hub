import { AUTHOR_EDITOR_PATH, AUTHORS_PAGE_TITLES, AUTHORS_PATH } from "@/features/authors";
import { NEW_POEM_PATH, POEM_MANAGEMENT_TRAIL_LABELS } from "@/features/poem-management";
import { POEMS_SEGMENT } from "@/features/poems";
import { ACCOUNT_PATH, POEM_MANAGEMENT_PATH, SIGN_IN_PATH, SIGN_UP_PATH } from "@/shared/config/account-paths";
import { ABOUT_PATH, PRIVACY_PATH } from "@/shared/config/constants";

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
  { path: POEM_MANAGEMENT_PATH, label: POEM_MANAGEMENT_TRAIL_LABELS.list },
  { path: NEW_POEM_PATH, label: POEM_MANAGEMENT_TRAIL_LABELS.newPoem },
  { path: SIGN_IN_PATH, label: BREADCRUMB_LABELS.signIn },
  { path: SIGN_UP_PATH, label: BREADCRUMB_LABELS.signUp },
  { path: ABOUT_PATH, label: BREADCRUMB_LABELS.about },
  { path: PRIVACY_PATH, label: BREADCRUMB_LABELS.privacyPolicy },
];

const AUTHOR_PAGE_PREFIX = `${AUTHORS_PATH}/`;

const OWN_POEM_PREFIX = `${POEM_MANAGEMENT_PATH}/`;

const NO_MATCH: RouteMatch = { kind: "none" };

function isParentPath(parent: string, path: string): boolean {
  return path.startsWith(`${parent}/`);
}

/**
 * The dynamic rows, over the segments after the author directory: `[id]` is the author page and
 * `[id, "poems", poemId]` one poem; anything else, `[id, "poems"]` included, has no trail.
 */
function matchAuthorRoute(path: string): RouteMatch {
  if (!path.startsWith(AUTHOR_PAGE_PREFIX)) return NO_MATCH;

  const [authorId, section, poemId, ...extra] = path.slice(AUTHOR_PAGE_PREFIX.length).split("/");
  if (authorId === undefined || authorId === "" || extra.length > 0) return NO_MATCH;
  if (section === undefined) return { kind: "author", id: authorId };
  if (section !== POEMS_SEGMENT || poemId === undefined || poemId === "") return NO_MATCH;
  return { kind: "author-poem", authorId, poemId };
}

/**
 * The owner's page of one poem, `[poemId]` after the management path (design D10). Any single segment
 * matches: the add form's own row wins before this, and a malformed id reads as not-found, so no trail.
 */
function matchOwnPoemRoute(path: string): RouteMatch {
  if (!path.startsWith(OWN_POEM_PREFIX)) return NO_MATCH;

  const [poemId, ...extra] = path.slice(OWN_POEM_PREFIX.length).split("/");
  if (poemId === undefined || poemId === "" || extra.length > 0) return NO_MATCH;
  return { kind: "own-poem", poemId };
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

  const ownPoem = matchOwnPoemRoute(path);
  if (ownPoem.kind !== "none") return ownPoem;
  return matchAuthorRoute(path);
}

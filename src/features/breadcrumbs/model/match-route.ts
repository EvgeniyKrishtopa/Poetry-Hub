import type { RouteMatch } from "./breadcrumb.types";

/** Maps a URL's segments to its trail by the route table; anything not in the table is `none`. */
export function matchRoute(segments: readonly string[]): RouteMatch {
  void segments;
  throw new Error("not implemented");
}

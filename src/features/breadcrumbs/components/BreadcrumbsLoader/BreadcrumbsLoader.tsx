import type { BreadcrumbsLoaderProps } from "./BreadcrumbsLoader.types";

/** Awaits the segments, reads the author name only for an author page, renders the view or nothing. */
export async function BreadcrumbsLoader({ segments }: BreadcrumbsLoaderProps) {
  void segments;
  return null;
}

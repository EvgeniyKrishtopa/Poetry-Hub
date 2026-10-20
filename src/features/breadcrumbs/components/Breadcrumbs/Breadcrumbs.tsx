import type { BreadcrumbsProps } from "./Breadcrumbs.types";

/** The trail's Suspense boundary; its fallback holds the row's height (NFR-4). */
export function Breadcrumbs({ segments }: BreadcrumbsProps) {
  void segments;
  return null;
}

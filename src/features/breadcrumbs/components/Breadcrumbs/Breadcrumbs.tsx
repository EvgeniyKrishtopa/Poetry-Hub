import { Suspense } from "react";

import { BreadcrumbsLoader } from "../BreadcrumbsLoader/BreadcrumbsLoader";
import { BreadcrumbsPlaceholder } from "../BreadcrumbsPlaceholder/BreadcrumbsPlaceholder";

import type { BreadcrumbsProps } from "./Breadcrumbs.types";

/** The trail's Suspense boundary; its fallback holds the row's height (NFR-4). */
export function Breadcrumbs({ segments }: BreadcrumbsProps) {
  return (
    <Suspense fallback={<BreadcrumbsPlaceholder />}>
      <BreadcrumbsLoader segments={segments} />
    </Suspense>
  );
}

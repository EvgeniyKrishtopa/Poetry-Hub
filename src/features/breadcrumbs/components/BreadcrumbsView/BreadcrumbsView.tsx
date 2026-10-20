import Link from "next/link";

import { BREADCRUMB_SEPARATOR, BREADCRUMBS_LANDMARK_LABEL } from "../../model/breadcrumbs-messages";

import type { BreadcrumbsViewProps } from "./BreadcrumbsView.types";

/** The trail: a named nav landmark with an ordered list, the current item marked (FR-3, NFR-3). */
export function BreadcrumbsView({ items }: BreadcrumbsViewProps) {
  return (
    <nav aria-label={BREADCRUMBS_LANDMARK_LABEL} className="mx-auto w-full max-w-4xl px-6 pt-4 text-sm">
      <ol className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        {items.map((item, index) => (
          // A trail never repeats a label, so the label is a stable key.
          <li key={item.label} className="inline-flex min-w-0 items-baseline gap-2">
            {/* The separator sits inside the item it precedes, so the list holds one item per label. */}
            {index > 0 && (
              <span aria-hidden="true" className="text-muted">
                {BREADCRUMB_SEPARATOR}
              </span>
            )}
            {item.kind === "link" ? (
              <Link href={item.href} className="text-foreground transition-colors hover:text-accent">
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="min-w-0 font-medium text-accent wrap-anywhere">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

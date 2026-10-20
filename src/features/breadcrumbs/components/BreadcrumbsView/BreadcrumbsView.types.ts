import type { BreadcrumbItem } from "../../model/breadcrumb.types";

export interface BreadcrumbsViewProps {
  /** «Главная» first; the last item is the current page. */
  readonly items: readonly BreadcrumbItem[];
}

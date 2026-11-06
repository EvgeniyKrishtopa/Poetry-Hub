import { COLLECTION_FORM_COPY } from "../../model/collection-management-messages";

const SKELETON_BLOCK = "bg-surface animate-pulse motion-reduce:animate-none";

/** The description's two text lines (artboard 32: 56 and 40 % of the column). */
const TEXT_LINE_WIDTHS = ["w-9/16", "w-2/5"] as const;

/** The edit link's and the delete button's widths (artboard 32: 196 and 148 px). */
const BUTTON_WIDTHS = ["w-49", "w-37"] as const;

/** The collection page's loading state: a heading bar, two text bars, two button bars (ui-plan). */
export function CollectionPageSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      {/* Absolutely positioned (`sr-only`), so it adds no flex gap. */}
      <span role="status" className="sr-only">
        {COLLECTION_FORM_COPY.loading}
      </span>
      <div aria-hidden="true" data-skeleton className={`${SKELETON_BLOCK} h-10 w-70 max-w-full rounded`} />
      <div aria-hidden="true" className="flex flex-col gap-3">
        {TEXT_LINE_WIDTHS.map((width) => (
          <div key={width} data-skeleton className={`${SKELETON_BLOCK} h-5 rounded ${width}`} />
        ))}
      </div>
      <div aria-hidden="true" className="flex flex-wrap gap-2">
        {BUTTON_WIDTHS.map((width) => (
          <div key={width} data-skeleton className={`${SKELETON_BLOCK} h-9 rounded-full ${width}`} />
        ))}
      </div>
    </div>
  );
}

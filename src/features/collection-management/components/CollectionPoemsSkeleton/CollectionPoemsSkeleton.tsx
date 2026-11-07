import { COLLECTION_POEMS_PAGE_COPY } from "../../model/collection-management-messages";

const SKELETON_BLOCK = "bg-surface animate-pulse motion-reduce:animate-none";

/** The label bars of three checkbox rows, of different lengths. */
const ROW_LABEL_WIDTHS = ["w-56", "w-44", "w-64"] as const;

/** The poems page's loading state: the hint's bar and checkbox rows under the shell's heading (ui-plan). */
export function CollectionPoemsSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      {/* Absolutely positioned (`sr-only`), so it adds no flex gap. */}
      <span role="status" className="sr-only">
        {COLLECTION_POEMS_PAGE_COPY.loading}
      </span>
      <div aria-hidden="true" data-skeleton className={`${SKELETON_BLOCK} h-6 w-full max-w-xl rounded`} />
      <div aria-hidden="true" className="flex flex-col gap-3">
        {ROW_LABEL_WIDTHS.map((width) => (
          <div key={width} className="flex items-center gap-3">
            <div data-skeleton className={`${SKELETON_BLOCK} size-4.5 rounded`} />
            <div data-skeleton className={`${SKELETON_BLOCK} h-7 max-w-full rounded ${width}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

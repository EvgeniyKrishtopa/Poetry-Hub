import { PUBLIC_COLLECTIONS_LOADING_LABEL } from "../../model/public-collections-messages";

const SKELETON_BLOCK = "rounded bg-surface animate-pulse motion-reduce:animate-none";

/** Artboard 39: a heading bar, two description bars, then three poem link bars. */
const DESCRIPTION_BAR_WIDTHS = ["w-full", "w-3/4"] as const;
const POEM_BAR_WIDTHS = ["w-1/2", "w-2/5", "w-3/5"] as const;

/** The public collection page's loading state, built like `PoemPageSkeleton` (public-collections D7). */
export function PublicCollectionSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      {/* Absolutely positioned (`sr-only`), so it adds no flex gap. */}
      <span role="status" className="sr-only">
        {PUBLIC_COLLECTIONS_LOADING_LABEL}
      </span>
      <div aria-hidden="true" data-skeleton className={`${SKELETON_BLOCK} h-10 w-70 max-w-full`} />
      <div aria-hidden="true" className="flex flex-col gap-3">
        {DESCRIPTION_BAR_WIDTHS.map((width) => (
          <div key={width} data-skeleton className={`${SKELETON_BLOCK} h-5 ${width}`} />
        ))}
      </div>
      <div aria-hidden="true" className="flex flex-col gap-3">
        {POEM_BAR_WIDTHS.map((width) => (
          <div key={width} data-skeleton className={`${SKELETON_BLOCK} h-6 ${width}`} />
        ))}
      </div>
    </div>
  );
}

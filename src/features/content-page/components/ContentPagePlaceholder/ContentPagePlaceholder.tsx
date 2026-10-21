import { CONTENT_PAGE_LOADING_LABEL } from "../../model/content-page-messages";

const SKELETON_BLOCK = "rounded bg-surface animate-pulse motion-reduce:animate-none";

// Line widths per paragraph group, from the approved mockup rounded to Tailwind fractions; ragged last lines.
const SKELETON_PARAGRAPHS = [
  ["w-full", "w-11/12", "w-full", "w-7/12"],
  ["w-full", "w-11/12", "w-full", "w-1/3"],
  ["w-full", "w-3/4"],
] as const;

/** The skeleton shown while a content page's entry streams (design D3). */
export function ContentPagePlaceholder() {
  return (
    <>
      {/* Absolutely positioned (`sr-only`), so it adds no flex gap in the route's main. */}
      <span role="status" className="sr-only">
        {CONTENT_PAGE_LOADING_LABEL}
      </span>
      <div aria-hidden="true" data-skeleton className={`${SKELETON_BLOCK} h-9 w-3/5 max-w-105 sm:h-10`} />
      <div aria-hidden="true" className="flex w-full max-w-prose flex-col gap-6">
        {SKELETON_PARAGRAPHS.map((lineWidths, paragraphIndex) => (
          <div key={paragraphIndex} className="flex flex-col gap-3">
            {lineWidths.map((width, lineIndex) => (
              <div key={lineIndex} data-skeleton className={`${SKELETON_BLOCK} h-4 ${width}`} />
            ))}
          </div>
        ))}
      </div>
    </>
  );
}

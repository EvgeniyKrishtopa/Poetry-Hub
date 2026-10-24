import { Suspense } from "react";

import { POEMS_LOADING_LABEL } from "../../model/poems-messages";
import { PoemPageContent } from "../PoemPageContent/PoemPageContent";

import type { PoemPageProps } from "./PoemPage.types";

/** The mockup's three text lines under the heading skeleton (62, 56, 48 % of the column). */
const SKELETON_TEXT_LINE_WIDTHS = ["w-5/8", "w-9/16", "w-12/25"] as const;

const SKELETON_BLOCK = "rounded bg-surface animate-pulse motion-reduce:animate-none";

/** The poem page's Suspense boundary: `notFound()` on an unknown author or poem, throws on unavailable. */
export function PoemPage({ authorId, poemId }: PoemPageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-8">
          {/* Absolutely positioned (`sr-only`), so it adds no flex gap. */}
          <span role="status" className="sr-only">
            {POEMS_LOADING_LABEL}
          </span>
          {/* The illustration's own 16:9 box, so the text doesn't jump when the image arrives. */}
          <div aria-hidden="true" data-skeleton className={`${SKELETON_BLOCK} aspect-video w-full rounded-2xl`} />
          <div aria-hidden="true" data-skeleton className={`${SKELETON_BLOCK} h-10 w-70 max-w-full`} />
          <div aria-hidden="true" className="flex flex-col gap-3.5">
            {SKELETON_TEXT_LINE_WIDTHS.map((width) => (
              <div key={width} data-skeleton className={`${SKELETON_BLOCK} h-4 ${width}`} />
            ))}
          </div>
        </div>
      }
    >
      <PoemPageContent authorId={authorId} poemId={poemId} />
    </Suspense>
  );
}

import { Suspense } from "react";

import { AuthorPageContent } from "../AuthorPageContent/AuthorPageContent";

import type { AuthorPageProps } from "./AuthorPage.types";

/** The mockup's loading text lines under the heading and photo skeletons. */
const SKELETON_TEXT_LINE_WIDTHS = ["w-full", "w-11/12", "w-3/4"] as const;

const SKELETON_BLOCK = "rounded bg-surface animate-pulse motion-reduce:animate-none";

/** The author page's Suspense boundary: `notFound()` on not-found, throws on unavailable (FR-14). */
export function AuthorPage({ id, poems }: AuthorPageProps) {
  return (
    <Suspense
      fallback={
        <div aria-hidden="true" className="flex flex-col gap-8">
          <div data-skeleton className={`${SKELETON_BLOCK} h-10 w-80 max-w-full`} />
          <div data-skeleton className={`${SKELETON_BLOCK} aspect-[3/4] w-full rounded-2xl min-[460px]:w-75`} />
          <div className="flex flex-col gap-4">
            {SKELETON_TEXT_LINE_WIDTHS.map((width) => (
              <div key={width} data-skeleton className={`${SKELETON_BLOCK} h-4 ${width}`} />
            ))}
          </div>
        </div>
      }
    >
      <AuthorPageContent id={id} poems={poems} />
    </Suspense>
  );
}

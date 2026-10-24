import { Suspense } from "react";

import { POEMS_LOADING_LABEL } from "../../model/poems-messages";
import { AuthorPoemsPageContent } from "../AuthorPoemsPageContent/AuthorPoemsPageContent";

import type { AuthorPoemsPageProps } from "./AuthorPoemsPage.types";

/** The mockup's three title lines under the heading skeleton (168, 208, 144 px). */
const SKELETON_TITLE_WIDTHS = ["w-42", "w-52", "w-36"] as const;

const SKELETON_BLOCK = "rounded bg-surface animate-pulse motion-reduce:animate-none";

/** The poem list page's Suspense boundary: `notFound()` on an unknown author, throws on unavailable. */
export function AuthorPoemsPage({ authorId }: AuthorPoemsPageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-8">
          {/* Absolutely positioned (`sr-only`), so it adds no flex gap. */}
          <span role="status" className="sr-only">
            {POEMS_LOADING_LABEL}
          </span>
          <div aria-hidden="true" data-skeleton className={`${SKELETON_BLOCK} h-10 w-60 max-w-full`} />
          <div aria-hidden="true" className="flex flex-col gap-4">
            {SKELETON_TITLE_WIDTHS.map((width) => (
              <div key={width} data-skeleton className={`${SKELETON_BLOCK} h-6 max-w-full ${width}`} />
            ))}
          </div>
        </div>
      }
    >
      <AuthorPoemsPageContent authorId={authorId} />
    </Suspense>
  );
}

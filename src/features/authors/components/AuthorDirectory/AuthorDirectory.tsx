import { Suspense } from "react";

import { RUSSIAN_LANG } from "@/shared/config/constants";

import { PAGE_TITLES } from "../../model/author-messages";
import { AuthorListLoader } from "../AuthorListLoader/AuthorListLoader";

/** The mockup's loading lines, 128–184 px wide. */
const SKELETON_LINE_WIDTHS = ["w-40", "w-32", "w-46", "w-36", "w-44"] as const;

const SKELETON_BLOCK = "h-6 rounded bg-surface animate-pulse motion-reduce:animate-none";

/**
 * The directory's Suspense boundary around the cached list read (FR-13). A failed read is cached for
 * seconds only, too short to prerender, so the read needs a boundary to stream into.
 */
export function AuthorDirectory() {
  return (
    <Suspense
      fallback={
        <section lang={RUSSIAN_LANG} className="flex flex-col gap-8">
          <h1 className="text-4xl font-bold tracking-tight">{PAGE_TITLES.authors}</h1>
          <div aria-hidden="true" className="flex flex-col gap-4">
            {SKELETON_LINE_WIDTHS.map((width) => (
              <div key={width} data-skeleton className={`${SKELETON_BLOCK} ${width}`} />
            ))}
          </div>
        </section>
      }
    >
      <AuthorListLoader />
    </Suspense>
  );
}

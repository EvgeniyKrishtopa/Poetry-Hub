import { Suspense } from "react";

import { PoemPageContent } from "../PoemPageContent/PoemPageContent";
import { PoemPageSkeleton } from "../PoemPageSkeleton/PoemPageSkeleton";

import type { PoemPageProps } from "./PoemPage.types";

/**
 * The poem page's Suspense boundary: `notFound()` on an unknown author or poem, throws on unavailable. The route's
 * params arrive as promises and are awaited only inside the boundary: awaiting them above it would make the whole page
 * dynamic, while here the shell and the skeleton prerender and only the poem streams in (Cache Components).
 */
export function PoemPage({ authorId, poemId, renderModeration }: PoemPageProps) {
  return (
    <Suspense fallback={<PoemPageSkeleton />}>
      <PoemPageContent authorId={authorId} poemId={poemId} renderModeration={renderModeration} />
    </Suspense>
  );
}

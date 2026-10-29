import { Suspense } from "react";

import { PoemPageContent } from "../PoemPageContent/PoemPageContent";
import { PoemPageSkeleton } from "../PoemPageSkeleton/PoemPageSkeleton";

import type { PoemPageProps } from "./PoemPage.types";

/** The poem page's Suspense boundary: `notFound()` on an unknown author or poem, throws on unavailable. */
export function PoemPage({ authorId, poemId }: PoemPageProps) {
  return (
    <Suspense fallback={<PoemPageSkeleton />}>
      <PoemPageContent authorId={authorId} poemId={poemId} />
    </Suspense>
  );
}

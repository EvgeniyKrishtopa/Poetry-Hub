import { Suspense } from "react";

import { PoemPageSkeleton } from "@/features/poems";
import { CONTENT_LANG } from "@/shared/config/constants";

import { OwnPoemContent } from "../OwnPoemContent/OwnPoemContent";

import type { OwnPoemPageProps } from "./OwnPoemPage.types";

/** `/account/poems/<poemId>`: the owner's poem in a Suspense boundary, with the public page's skeleton (FR-7, FR-13). */
export function OwnPoemPage({ poemId }: OwnPoemPageProps) {
  return (
    <div lang={CONTENT_LANG}>
      <Suspense fallback={<PoemPageSkeleton />}>
        <OwnPoemContent poemId={poemId} />
      </Suspense>
    </div>
  );
}

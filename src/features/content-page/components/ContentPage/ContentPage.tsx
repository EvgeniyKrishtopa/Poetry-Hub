import { Suspense } from "react";

import { ContentPageContent } from "../ContentPageContent/ContentPageContent";
import { ContentPagePlaceholder } from "../ContentPagePlaceholder/ContentPagePlaceholder";

import type { ContentPageProps } from "./ContentPage.types";

/** A content page's Suspense boundary around its content (design D3). */
export function ContentPage({ entryKey }: ContentPageProps) {
  return (
    <Suspense fallback={<ContentPagePlaceholder />}>
      <ContentPageContent entryKey={entryKey} />
    </Suspense>
  );
}

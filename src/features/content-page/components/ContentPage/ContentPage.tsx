import { Suspense } from "react";

import { ContentPageContent } from "../ContentPageContent/ContentPageContent";
import { ContentPagePlaceholder } from "../ContentPagePlaceholder/ContentPagePlaceholder";

/** The about page's Suspense boundary around its content (design D3). */
export function ContentPage() {
  return (
    <Suspense fallback={<ContentPagePlaceholder />}>
      <ContentPageContent />
    </Suspense>
  );
}

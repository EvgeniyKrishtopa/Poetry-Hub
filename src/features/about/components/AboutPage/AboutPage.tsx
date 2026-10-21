import { Suspense } from "react";

import { AboutContent } from "../AboutContent/AboutContent";
import { AboutPlaceholder } from "../AboutPlaceholder/AboutPlaceholder";

/** The about page's Suspense boundary around its content (design D3). */
export function AboutPage() {
  return (
    <Suspense fallback={<AboutPlaceholder />}>
      <AboutContent />
    </Suspense>
  );
}

import type { FeaturedWork, SectionResult } from "../../model/home-section.types";

export interface HomeFeaturedWorksProps {
  /** Awaited by the page, so this component stays synchronous. */
  readonly result: SectionResult<FeaturedWork>;
}

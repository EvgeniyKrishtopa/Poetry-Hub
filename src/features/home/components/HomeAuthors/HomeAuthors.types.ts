import type { FeaturedAuthor, SectionResult } from "../../model/home-section.types";

export interface HomeAuthorsProps {
  /** Awaited by the page, so this component stays synchronous. */
  readonly result: SectionResult<FeaturedAuthor>;
}

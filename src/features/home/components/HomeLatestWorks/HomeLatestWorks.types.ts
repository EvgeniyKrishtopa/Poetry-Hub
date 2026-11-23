import type { LatestWork, SectionResult } from "../../model/home-section.types";

export interface HomeLatestWorksProps {
  /** Awaited by the page, so this component stays synchronous. */
  readonly result: SectionResult<LatestWork>;
}

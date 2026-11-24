import type { SectionCopy } from "../../model/greeting.types";

export interface HomeAboutProps {
  /** The section's heading and text: the CMS greeting's, or the static copy `resolveSectionCopy` gives. */
  readonly copy: SectionCopy;
}

import type { ReactNode } from "react";

export interface SectionHeadingProps {
  /** `large` is the closing invitation's heading, one step above the other sections'. */
  readonly size?: "regular" | "large";
  readonly children: ReactNode;
}

import type { ReactNode } from "react";

export interface HomeSectionProps {
  /** `surface` is a tinted band; `plain` sits on the page background. Bands alternate down the page. */
  readonly tone?: "plain" | "surface";
  /** `wide` is the 1152 px column of the card grids, `text` the 896 px reading column. */
  readonly width?: "wide" | "text";
  readonly children: ReactNode;
}

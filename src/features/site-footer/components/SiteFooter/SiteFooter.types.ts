import type { ReactNode } from "react";

export interface SiteFooterProps {
  /** The contact button, filled in by the root layout; the cached body never reads it (design D7). */
  readonly contactControl: ReactNode;
}

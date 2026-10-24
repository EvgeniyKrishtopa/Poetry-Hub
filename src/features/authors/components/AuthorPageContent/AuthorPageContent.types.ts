import type { ReactNode } from "react";

export interface AuthorPageContentProps {
  /** The route's `id` param, still a promise: it is runtime data, awaited only inside the boundary. */
  readonly id: Promise<string>;
  /** The poems entry, passed through to the profile view. */
  readonly poems: ReactNode;
}

import type { ReactNode } from "react";

export interface AuthorPageProps {
  /** The route's `id` param, awaited inside the Suspense boundary. */
  readonly id: Promise<string>;
  /**
   * The poems entry, composed by the route so this feature imports nothing from poems. Rendered
   * last in the profile, only once the profile is found.
   */
  readonly poems: ReactNode;
}

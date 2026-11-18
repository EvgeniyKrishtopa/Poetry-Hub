import type { ReactNode } from "react";

/** What a moderation control needs to know about the author on the page (admin-violations-feedback design D7). */
interface AuthorModerationTarget {
  readonly authorId: string;
  readonly authorName: string;
}

export interface AuthorPageProps {
  /** The route's `id` param, awaited inside the Suspense boundary. */
  readonly id: Promise<string>;
  /**
   * The poems entry, composed by the route so this feature imports nothing from poems. Rendered
   * last in the profile, only once the profile is found.
   */
  readonly poems: ReactNode;
  /**
   * Called with the author once the profile has been read, so the route file can add a control under the heading
   * without this feature knowing what the control is. Never called on a missing author. A function for the same
   * reason as the poem page's: the profile id is known only inside the boundary.
   */
  readonly renderModeration?: (target: AuthorModerationTarget) => ReactNode;
}

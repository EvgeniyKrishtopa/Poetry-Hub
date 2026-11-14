import type { ReactNode } from "react";

/** What a moderation control needs to know about the poem on the page (admin-moderation design D8). */
interface PoemModerationTarget {
  readonly id: string;
  readonly title: string;
  readonly authorId: string;
}

export interface PoemPageProps {
  /** The route's `id` param, awaited inside the Suspense boundary. */
  readonly authorId: Promise<string>;
  /** The route's `poemId` param, awaited inside the Suspense boundary. */
  readonly poemId: Promise<string>;
  /**
   * Called with the poem once it has been read, so the route file can add a control next to it without this feature
   * knowing what the control is. Never called on a missing poem.
   */
  readonly moderation?: (target: PoemModerationTarget) => ReactNode;
}

import type { ReactNode } from "react";

/** What a moderation control needs to know about the poem on the page (admin-moderation design D8). */
interface PoemModerationTarget {
  readonly id: string;
  readonly title: string;
  readonly authorId: string;
  readonly authorName: string;
}

export interface PoemPageProps {
  /** The route's `id` param, awaited inside the Suspense boundary. */
  readonly authorId: Promise<string>;
  /** The route's `poemId` param, awaited inside the Suspense boundary. */
  readonly poemId: Promise<string>;
  /**
   * Called with the poem once it has been read, so the route file can add a control next to it without this feature
   * knowing what the control is. Never called on a missing poem.
   *
   * Why a function, not an element: the poem's id and title are known only after the read inside the Suspense
   * boundary, and a missing poem must show no control. Why a prop at all: `poems` may not import `admin`, so the route
   * file, which sits above both features, is where the two meet.
   */
  readonly renderModeration?: (target: PoemModerationTarget) => ReactNode;
}

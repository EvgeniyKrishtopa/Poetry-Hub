import type { ReactNode } from "react";

/** What a moderation control needs to know about the collection on the page (admin-moderation design D8). */
interface CollectionModerationTarget {
  readonly id: string;
  readonly title: string;
  readonly authorId: string;
  readonly authorName: string;
}

export interface PublicCollectionPageProps {
  /** The route's `id` param, awaited inside the Suspense boundary. */
  readonly authorId: Promise<string>;
  /** The route's `collectionId` param, awaited inside the Suspense boundary. */
  readonly collectionId: Promise<string>;
  /**
   * Called with the collection once it has been read, so the route file can add a control under the poems without
   * this feature knowing what the control is. Never called on a missing collection.
   *
   * Why a function, not an element: the collection's id and title are known only after the read inside the Suspense
   * boundary, and a missing collection must show no control. Why a prop at all: `collections` may not import `admin`,
   * so the route file, which sits above both features, is where the two meet.
   */
  readonly renderModeration?: (target: CollectionModerationTarget) => ReactNode;
}

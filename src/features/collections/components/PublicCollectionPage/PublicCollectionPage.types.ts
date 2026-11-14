import type { ReactNode } from "react";

/** What a moderation control needs to know about the collection on the page (admin-moderation design D8). */
interface CollectionModerationTarget {
  readonly id: string;
  readonly title: string;
  readonly authorId: string;
}

export interface PublicCollectionPageProps {
  /** The route's `id` param, awaited inside the Suspense boundary. */
  readonly authorId: Promise<string>;
  /** The route's `collectionId` param, awaited inside the Suspense boundary. */
  readonly collectionId: Promise<string>;
  /**
   * Called with the collection once it has been read, so the route file can add a control under the poems without
   * this feature knowing what the control is. Never called on a missing collection.
   */
  readonly moderation?: (target: CollectionModerationTarget) => ReactNode;
}

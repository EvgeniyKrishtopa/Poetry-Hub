import type { PublicCollectionPageProps } from "../PublicCollectionPage/PublicCollectionPage.types";

export interface PublicCollectionContentProps extends Pick<PublicCollectionPageProps, "renderModeration"> {
  /** The route's `id` param. */
  readonly authorId: Promise<string>;
  /** The route's `collectionId` param. */
  readonly collectionId: Promise<string>;
}

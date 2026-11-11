export interface PublicCollectionContentProps {
  /** The route's `id` param. */
  readonly authorId: Promise<string>;
  /** The route's `collectionId` param. */
  readonly collectionId: Promise<string>;
}

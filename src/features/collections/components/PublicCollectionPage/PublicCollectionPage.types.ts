export interface PublicCollectionPageProps {
  /** The route's `id` param, awaited inside the Suspense boundary. */
  readonly authorId: Promise<string>;
  /** The route's `collectionId` param, awaited inside the Suspense boundary. */
  readonly collectionId: Promise<string>;
}

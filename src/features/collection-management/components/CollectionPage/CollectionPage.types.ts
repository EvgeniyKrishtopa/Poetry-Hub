export interface CollectionPageProps {
  /** The route's param, awaited inside the boundary. */
  readonly collectionId: Promise<string>;
}

export interface CollectionPoemsPageProps {
  /** The route's param, awaited inside the boundary. */
  readonly collectionId: Promise<string>;
}

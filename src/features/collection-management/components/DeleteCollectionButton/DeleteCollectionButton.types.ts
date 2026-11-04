export interface DeleteCollectionButtonProps {
  /** The collection to delete: the only value sent to the server (design D7). */
  readonly collectionId: string;
  /** Shown in the dialog; never sent. */
  readonly title: string;
}

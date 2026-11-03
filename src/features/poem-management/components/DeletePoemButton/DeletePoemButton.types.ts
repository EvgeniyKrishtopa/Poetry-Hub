export interface DeletePoemButtonProps {
  /** The poem to delete: the only value sent to the server (design D3). */
  readonly poemId: string;
  /** Shown in the dialog and the deleted notice; never sent. */
  readonly title: string;
}

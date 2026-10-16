export interface PhotoPickerProps {
  /** The input's id; the field row's caption label points at it too. */
  readonly id: string;
  /** The chosen file's name, once one passed the browser check. */
  readonly fileName: string | null;
  /** The id of the field's error text, when it shows one. */
  readonly errorId: string | undefined;
  readonly onFileChange: (input: HTMLInputElement) => void;
}

export interface ImagePickerProps {
  /** The input's id; the field's label points at it too. */
  readonly id: string;
  /** The visible button text, e.g. authors' `PHOTO_PICKER_LABEL`. */
  readonly buttonLabel: string;
  /** The chosen file's name, once one passed the browser check. */
  readonly fileName: string | null;
  /** The id of the field's error text, when it shows one. */
  readonly errorId: string | undefined;
  readonly onFileChange: (input: HTMLInputElement) => void;
  /** Focus the input on mount: for a picker that opens on demand, not one inside a form. */
  readonly autoFocus?: boolean;
}

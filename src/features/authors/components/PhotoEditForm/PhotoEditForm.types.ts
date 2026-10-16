import type { PhotoDraft } from "../PhotoFieldEditor/PhotoFieldEditor.types";

export interface PhotoEditFormProps {
  readonly draft: PhotoDraft | null;
  readonly error: string | undefined;
  /** For the preview's alt text. */
  readonly fullName: string;
  readonly onFileChange: (input: HTMLInputElement) => void;
  readonly onSubmit: () => void;
  readonly onCancel: () => void;
}

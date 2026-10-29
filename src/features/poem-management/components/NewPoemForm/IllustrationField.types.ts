import type { ImageDraft } from "@/shared/lib/image-file/image-file.types";

export interface IllustrationFieldProps {
  /** The file input's id; the field's label points at it. */
  readonly id: string;
  /** Changes when the choice is removed, so the native input forgets the file. */
  readonly pickerKey: number;
  /** The chosen file that passed the browser check, with its preview. */
  readonly draft: ImageDraft | null;
  readonly error: string | undefined;
  readonly onFileChange: (input: HTMLInputElement) => void;
  readonly onRemove: () => void;
}

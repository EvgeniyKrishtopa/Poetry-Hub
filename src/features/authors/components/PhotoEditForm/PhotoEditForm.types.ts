import type { ImageDraft } from "@/shared/lib/image-file/image-file.types";

export interface PhotoEditFormProps {
  readonly draft: ImageDraft | null;
  readonly error: string | undefined;
  /** For the preview's alt text. */
  readonly fullName: string;
  readonly onFileChange: (input: HTMLInputElement) => void;
  readonly onSubmit: () => void;
  readonly onCancel: () => void;
}

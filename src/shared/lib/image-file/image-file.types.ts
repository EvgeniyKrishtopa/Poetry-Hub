export type ImageType = "png" | "jpeg";

export type ImageFileError = "too-large" | "unsupported-type";

export type ImageFileCheck =
  | { readonly ok: true; readonly type: ImageType }
  | { readonly ok: false; readonly error: ImageFileError };

/** A chosen image file that passed the browser check, with an object URL for its preview. */
export interface ImageDraft {
  readonly file: File;
  readonly previewUrl: string;
}

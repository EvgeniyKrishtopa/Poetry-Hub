import type { FieldEditorControls } from "../AuthorProfileEditor/AuthorProfileEditor.types";

export interface PhotoFieldEditorProps extends FieldEditorControls {
  readonly photoUrl: string | null;
  /** For the photo's alt text; empty while the profile has no name. */
  readonly fullName: string;
}

/** A chosen file that passed the browser check, with an object URL for its preview. */
export interface PhotoDraft {
  readonly file: File;
  readonly previewUrl: string;
}

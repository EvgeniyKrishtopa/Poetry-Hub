import type { FieldEditorControls } from "../../hooks/profile-field.types";

export interface PhotoFieldEditorProps extends FieldEditorControls {
  readonly photoUrl: string | null;
  /** For the photo's alt text; empty while the profile has no name. */
  readonly fullName: string;
}

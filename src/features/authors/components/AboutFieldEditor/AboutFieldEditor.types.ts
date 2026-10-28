import type { FieldEditorControls } from "../../hooks/profile-field.types";

export interface AboutFieldEditorProps extends FieldEditorControls {
  readonly savedAbout: string | null;
}

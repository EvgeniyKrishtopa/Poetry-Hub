import type { NameField } from "../../model/author.types";
import type { FieldEditorControls } from "../../hooks/profile-field.types";

export interface NameFieldEditorProps extends FieldEditorControls {
  readonly field: NameField;
  readonly savedValue: string | null;
}

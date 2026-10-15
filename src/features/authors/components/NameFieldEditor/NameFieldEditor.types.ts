import type { NameField } from "../../model/author.types";
import type { FieldEditorControls } from "../AuthorProfileEditor/AuthorProfileEditor.types";

export interface NameFieldEditorProps extends FieldEditorControls {
  readonly field: NameField;
  readonly savedValue: string | null;
}

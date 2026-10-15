import type { AboutAlign } from "../../model/author.types";
import type { FieldEditorControls } from "../AuthorProfileEditor/AuthorProfileEditor.types";

export interface AboutFieldEditorProps extends FieldEditorControls {
  readonly savedAbout: string | null;
  readonly savedAlign: AboutAlign;
}

import type { AboutAlign } from "../../model/author.types";
import type { FieldEditorControls } from "../AuthorProfileEditor/AuthorProfileEditor.types";

export interface AboutFieldEditorProps extends FieldEditorControls {
  readonly savedAbout: string | null;
  readonly savedAlign: AboutAlign;
}

/** About's value and draft: the Markdown source with its alignment, saved together. */
export interface AboutContent {
  readonly markdown: string;
  readonly align: AboutAlign;
}

export type AboutView = "editor" | "preview";

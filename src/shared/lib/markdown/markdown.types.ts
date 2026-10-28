/**
 * A toolbar format. The profile's about uses the first seven; a poem uses bold, italic, and the last
 * three (add-poem-creation design D6).
 */
export type MarkdownFormat =
  | "bold"
  | "italic"
  | "heading"
  | "subheading"
  | "bulleted"
  | "numbered"
  | "quote"
  | "epigraph"
  | "separator"
  | "indent";

export interface TextSelection {
  readonly start: number;
  readonly end: number;
}

export interface FormattedText {
  readonly text: string;
  readonly selection: TextSelection;
}

import type { MarkdownFormat } from "@/shared/lib/markdown/markdown.types";

import type { MarkdownTextVariant } from "../MarkdownText/MarkdownText.types";

export type MarkdownView = "editor" | "preview";

export interface MarkdownEditorProps {
  /** The textarea's id: the caller renders the field's label with `htmlFor` pointing at it. */
  readonly id: string;
  /** The Markdown source being edited. */
  readonly value: string;
  readonly onChange: (value: string) => void;
  /** The field error shown under the textarea; the textarea is then `aria-invalid`. */
  readonly error: string | undefined;
  /** The value's length as the field's validation measures it, for the counter. */
  readonly length: number;
  /** The counter's limit; above it the counter turns to the danger colour. Typing is never capped. */
  readonly maxLength: number;
  /** The toolbar's buttons, in order. */
  readonly formats: readonly MarkdownFormat[];
  /** How the preview tab renders the draft: the same way its page does. */
  readonly variant: MarkdownTextVariant;
  /** Focus the textarea on mount: for an editor that opens on demand, not one inside a form. */
  readonly autoFocus?: boolean;
}

/** `about`: the author profile's look and allowlist. `poem`: a poem's (add-poem-creation design D6). */
export type MarkdownTextVariant = "about" | "poem";

export interface MarkdownTextProps {
  readonly markdown: string;
  readonly variant?: MarkdownTextVariant;
}

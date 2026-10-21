import { toContentBlocks } from "../../model/content-blocks";

import type { ContentPageArticleProps } from "./ContentPageArticle.types";

/**
 * The page heading, then the text's numbered headings and plain-text paragraphs (line breaks kept).
 * React escapes the text, so nothing is parsed as Markdown or HTML. Prose uses `foreground`, not
 * `muted`: long text needs full contrast.
 */
export function ContentPageArticle({ entry }: ContentPageArticleProps) {
  const blocks = toContentBlocks(entry.message);

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{entry.title}</h1>
      <article className="flex max-w-prose flex-col gap-6 text-prose-compact leading-relaxed text-foreground sm:text-lg">
        {blocks.map((block, index) => {
          switch (block.kind) {
            case "section":
              return (
                <h2 key={index} className="text-lg font-bold sm:text-xl">
                  {block.text}
                </h2>
              );
            case "subsection":
              return (
                <h3 key={index} className="font-bold">
                  {block.text}
                </h3>
              );
            case "paragraph":
              return (
                <p key={index} className="whitespace-pre-line">
                  {block.text}
                </p>
              );
          }
        })}
      </article>
    </>
  );
}

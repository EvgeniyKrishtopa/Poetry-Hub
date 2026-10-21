import { splitParagraphs } from "@/shared/lib/split-paragraphs";

import type { ContentPageArticleProps } from "./ContentPageArticle.types";

/**
 * The page heading and its plain-text paragraphs (line breaks kept). React escapes the text, so nothing
 * is parsed as Markdown or HTML. Prose uses `foreground`, not `muted`: long text needs full contrast.
 */
export function ContentPageArticle({ entry }: ContentPageArticleProps) {
  const paragraphs = splitParagraphs(entry.message);

  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{entry.title}</h1>
      <article className="flex max-w-prose flex-col gap-6 text-prose-compact leading-relaxed text-foreground sm:text-lg">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="whitespace-pre-line">
            {paragraph}
          </p>
        ))}
      </article>
    </>
  );
}

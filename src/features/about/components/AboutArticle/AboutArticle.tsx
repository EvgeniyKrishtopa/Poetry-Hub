import { splitParagraphs } from "@/shared/lib/split-paragraphs";

import type { AboutArticleProps } from "./AboutArticle.types";

/**
 * The page heading and its plain-text paragraphs (line breaks kept). React escapes the text, so nothing
 * is parsed as Markdown or HTML. Prose uses `foreground`, not `muted`: long text needs full contrast.
 */
export function AboutArticle({ entry }: AboutArticleProps) {
  const paragraphs = splitParagraphs(entry.message);

  return (
    <>
      <h1 className="text-4xl font-bold tracking-tight">{entry.title}</h1>
      <article className="flex max-w-prose flex-col gap-6 text-base leading-relaxed text-foreground sm:text-lg">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="whitespace-pre-line">
            {paragraph}
          </p>
        ))}
      </article>
    </>
  );
}

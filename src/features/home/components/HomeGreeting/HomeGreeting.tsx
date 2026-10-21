import { splitParagraphs } from "@/shared/lib/split-paragraphs";

import type { HomeGreetingProps } from "./HomeGreeting.types";

/**
 * Title as the page heading; message as plain-text paragraphs (line breaks kept).
 * Plain text only: React escapes it, nothing is parsed as Markdown or HTML.
 */
export function HomeGreeting({ greeting }: HomeGreetingProps) {
  const paragraphs = splitParagraphs(greeting.message);

  return (
    <header className="flex flex-col gap-2">
      <h1 className="text-4xl font-bold tracking-tight">{greeting.title}</h1>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="whitespace-pre-line text-muted">
          {paragraph}
        </p>
      ))}
    </header>
  );
}

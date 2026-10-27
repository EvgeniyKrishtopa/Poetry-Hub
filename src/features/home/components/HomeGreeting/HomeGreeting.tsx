import { splitParagraphs } from "@/shared/lib/split-paragraphs";

import type { HomeGreetingProps } from "./HomeGreeting.types";

/**
 * The home page's welcome banner: title as the page heading, message as plain-text paragraphs
 * (line breaks kept). Plain text only: React escapes it, nothing is parsed as Markdown or HTML.
 */
export function HomeGreeting({ greeting }: HomeGreetingProps) {
  const paragraphs = splitParagraphs(greeting.message);

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-6 sm:p-8">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{greeting.title}</h1>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="max-w-prose whitespace-pre-line text-base leading-relaxed sm:text-lg">
          {paragraph}
        </p>
      ))}
    </section>
  );
}

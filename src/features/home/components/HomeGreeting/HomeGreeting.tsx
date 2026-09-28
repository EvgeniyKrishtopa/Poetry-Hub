import type { GreetingContent } from "../../model/greeting.types";

interface HomeGreetingProps {
  greeting: GreetingContent;
}

/** One or more blank lines (whitespace-only lines count as blank) separate paragraphs. */
const PARAGRAPH_SEPARATOR = /\n\s*\n/;

/** Title as the page heading; message as plain-text paragraphs (line breaks kept). */
// implements FR-6 of add-contentful-home-greeting: plain text only — React escapes it, nothing is parsed as Markdown/HTML
export function HomeGreeting({ greeting }: HomeGreetingProps) {
  const paragraphs = greeting.message.split(PARAGRAPH_SEPARATOR);

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

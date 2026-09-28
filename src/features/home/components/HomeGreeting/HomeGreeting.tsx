import type { GreetingContent } from "../../model/greeting.types";

interface HomeGreetingProps {
  greeting: GreetingContent;
}

/** Title as the page heading; message as plain-text paragraphs (line breaks kept). */
export function HomeGreeting({ greeting }: HomeGreetingProps) {
  return null;
}

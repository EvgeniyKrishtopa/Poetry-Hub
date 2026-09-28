import type { Greeting } from "../../model/greeting.schema";

interface HomeGreetingProps {
  greeting: Pick<Greeting, "title" | "message">;
}

/** Title as the page heading; message as plain-text paragraphs (line breaks kept). */
export function HomeGreeting({ greeting }: HomeGreetingProps) {
  return null;
}

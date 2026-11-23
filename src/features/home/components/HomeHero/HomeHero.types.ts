import type { GreetingContent } from "../../model/greeting.types";

export interface HomeHeroProps {
  /** The CMS greeting, or the static fallback `resolveGreeting` gives when it could not be loaded (FR-1). */
  readonly greeting: GreetingContent;
}

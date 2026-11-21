import type { Greeting } from "../../model/greeting.schema";

export interface HomeHeroProps {
  /** The CMS greeting, or the static fallback `resolveGreeting` gives when it could not be loaded (FR-1). */
  readonly greeting: Greeting;
}

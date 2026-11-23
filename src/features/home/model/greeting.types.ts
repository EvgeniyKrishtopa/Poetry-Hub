import type { ContentfulErrorKind } from "@/shared/lib/contentful";

import type { Greeting } from "./greeting.schema";
import type { ABOUT_GREETING_KEY, JOIN_GREETING_KEY } from "./home.constants";

/** The only keys the home page reads: no free string reaches the query. */
export type GreetingKey = typeof ABOUT_GREETING_KEY | typeof JOIN_GREETING_KEY;

export type GreetingFailureReason = ContentfulErrorKind | "validation" | "not-found";

export type GreetingResult =
  | { readonly ok: true; readonly greeting: Greeting }
  | { readonly ok: false; readonly reason: GreetingFailureReason };

/** What a section displays: the CMS greeting's title and message, or the section's static copy. */
export interface SectionCopy {
  readonly heading: string;
  readonly text: string;
}
